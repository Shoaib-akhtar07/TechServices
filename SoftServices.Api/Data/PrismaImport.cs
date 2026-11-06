using System.Globalization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Services;

namespace SoftServices.Api.Data;

/// <summary>
/// One-time copy of the old Next.js / Prisma SQLite database (prisma/dev.db) into this API's database:
/// users (passwords keep working — both use bcrypt), subscriptions, manual payments, blog posts and
/// non-secret settings. Rows that already exist (same email / slug / id) are skipped, so it is safe to re-run.
/// </summary>
public static class PrismaImport
{
    public static async Task<int> RunAsync(AppDbContext db, SettingsService settings, string path)
    {
        if (!File.Exists(path))
        {
            Console.Error.WriteLine($"File not found: {path}");
            return 1;
        }
        await using var src = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly }.ToString());
        await src.OpenAsync();

        // ---- Users ----
        var importedUsers = new HashSet<string>();
        int users = 0, subs = 0, payments = 0, posts = 0, settingsCount = 0;
        await foreach (var r in Rows(src, "SELECT id, email, name, passwordHash, stripeCustomerId, role, createdAt FROM User"))
        {
            var email = Str(r["email"])!.ToLowerInvariant();
            var existing = await db.Users.FirstOrDefaultAsync(x => x.Email == email);
            if (existing is not null)
            {
                Console.WriteLine($"  user {email}: already exists, skipped");
                continue;
            }
            db.Users.Add(new User
            {
                Id = Str(r["id"])!,
                Email = email,
                Name = Str(r["name"]),
                PasswordHash = Str(r["passwordHash"])!,
                StripeCustomerId = Str(r["stripeCustomerId"]),
                Role = Roles.All.Contains(Str(r["role"])) ? Str(r["role"])! : Roles.User,
                CreatedAt = Date(r["createdAt"]) ?? DateTime.UtcNow,
            });
            importedUsers.Add(Str(r["id"])!);
            users++;
        }
        await db.SaveChangesAsync();

        // ---- Subscriptions ----
        await foreach (var r in Rows(src, "SELECT * FROM Subscription"))
        {
            var userId = Str(r["userId"])!;
            if (!importedUsers.Contains(userId) || await db.Subscriptions.AnyAsync(x => x.UserId == userId)) continue;
            db.Subscriptions.Add(new Subscription
            {
                Id = Str(r["id"])!,
                UserId = userId,
                Provider = Str(r["provider"]) ?? Providers.Stripe,
                StripeSubscriptionId = Str(r["stripeSubscriptionId"]),
                PaypalSubscriptionId = Str(r["paypalSubscriptionId"]),
                Status = Str(r["status"]) ?? "canceled",
                Plan = Plans.Normalize(Str(r["plan"])),
                CurrentPeriodEnd = Date(r["currentPeriodEnd"]) ?? DateTime.UtcNow,
                CancelAtPeriodEnd = Bool(r["cancelAtPeriodEnd"]),
            });
            subs++;
        }

        // ---- Manual payments ----
        await foreach (var r in Rows(src, "SELECT * FROM ManualPayment"))
        {
            var id = Str(r["id"])!;
            if (!importedUsers.Contains(Str(r["userId"])!) || await db.ManualPayments.AnyAsync(x => x.Id == id)) continue;
            db.ManualPayments.Add(new ManualPayment
            {
                Id = id,
                UserId = Str(r["userId"])!,
                Plan = Plans.Normalize(Str(r["plan"])),
                Amount = Str(r["amount"]) ?? "",
                Method = Str(r["method"]) ?? "",
                Reference = Str(r["reference"]) ?? "",
                Note = Str(r["note"]),
                Status = Str(r["status"]) ?? "pending",
                AdminNote = Str(r["adminNote"]),
                ReviewedBy = Str(r["reviewedBy"]),
                ReviewedAt = Date(r["reviewedAt"]),
                CreatedAt = Date(r["createdAt"]) ?? DateTime.UtcNow,
            });
            payments++;
        }

        // ---- Blog posts ----
        await foreach (var r in Rows(src, "SELECT * FROM Post"))
        {
            var slug = Str(r["slug"])!;
            if (await db.Posts.AnyAsync(x => x.Slug == slug))
            {
                Console.WriteLine($"  post /blog/{slug}/: already exists, skipped");
                continue;
            }
            var publishedAt = Date(r["publishedAt"]) ?? DateTime.UtcNow;
            db.Posts.Add(new Post
            {
                Slug = slug,
                Title = Str(r["title"]) ?? slug,
                Description = Str(r["description"]) ?? "",
                Tool = Str(r["tool"]),
                Body = Str(r["body"]) ?? "[]",
                Published = Bool(r["published"]),
                PublishedAt = publishedAt,
                CreatedAt = publishedAt,
            });
            posts++;
        }
        await db.SaveChangesAsync();

        // ---- Settings (non-secret; secrets were encrypted with the old NEXTAUTH_SECRET and must be re-entered) ----
        var values = new Dictionary<string, string?>();
        await foreach (var r in Rows(src, "SELECT key, value FROM Setting"))
        {
            var key = Str(r["key"])!;
            var value = Str(r["value"]) ?? "";
            if (!SettingsService.Definitions.TryGetValue(key, out var def)) continue;
            if (def.Secret || value.StartsWith("enc:"))
            {
                Console.WriteLine($"  setting {key}: secret — re-enter it in the admin panel");
                continue;
            }
            values[key] = value;
        }
        await settings.SaveAsync(values);
        settingsCount = values.Count;

        Console.WriteLine($"Imported {users} users, {subs} subscriptions, {payments} manual payments, {posts} posts, {settingsCount} settings.");
        return 0;
    }

    private static async IAsyncEnumerable<Dictionary<string, object?>> Rows(SqliteConnection c, string sql)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++) row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            yield return row;
        }
    }

    private static string? Str(object? v) => v?.ToString();

    private static bool Bool(object? v) => v switch { long l => l != 0, string s => s is "1" or "true", bool b => b, _ => false };

    /// <summary>Prisma stores SQLite dates as Unix milliseconds (older versions: ISO text).</summary>
    private static DateTime? Date(object? v) => v switch
    {
        long ms => DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime,
        string s when long.TryParse(s, out var ms) => DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime,
        string s when DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var d) => d,
        _ => null,
    };
}
