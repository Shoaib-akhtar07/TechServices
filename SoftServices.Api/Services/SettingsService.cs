using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SoftServices.Api.Data;

namespace SoftServices.Api.Services;

public record SettingDef(string? Default = null, string? Env = null, bool Secret = false);

/// <summary>
/// Everything the admin panel can change (prices, limits, payment keys). Values fall back to the
/// default (or an environment variable) until saved. Secrets are AES-256-GCM encrypted in the database.
/// </summary>
public class SettingsService(IServiceScopeFactory scopes, IOptions<AuthOptions> auth, ILogger<SettingsService> log)
{
    public static readonly IReadOnlyDictionary<string, SettingDef> Definitions = new Dictionary<string, SettingDef>
    {
        // "1" = every Pro feature is free for everyone with an account.
        ["free_mode"] = new("1"),

        // Site details shown by the website (empty = the website's built-in default).
        ["site_email"] = new(""),
        ["site_twitter"] = new(""),
        ["site_developer"] = new(""),
        ["site_developer_url"] = new(""),
        ["site_announcement"] = new(""),
        ["verify_google"] = new(""),
        ["verify_bing"] = new(""),
        // Per-tool text changes / hidden tools, as JSON: { [slug]: { hidden, name, short, title, description } }.
        ["tools"] = new("{}"),

        ["currency"] = new("USD"),
        ["price_monthly"] = new("5.99"),
        ["price_yearly"] = new("47.99"),
        ["pro_daily_limit"] = new("200", "PRO_DAILY_LIMIT"),

        ["stripe_enabled"] = new("1"),
        ["stripe_secret_key"] = new(Env: "STRIPE_SECRET_KEY", Secret: true),
        ["stripe_webhook_secret"] = new(Env: "STRIPE_WEBHOOK_SECRET", Secret: true),
        ["stripe_price_monthly"] = new(Env: "STRIPE_PRICE_MONTHLY"),
        ["stripe_price_yearly"] = new(Env: "STRIPE_PRICE_YEARLY"),

        ["paypal_enabled"] = new("0"),
        ["paypal_mode"] = new("sandbox"),
        ["paypal_client_id"] = new(),
        ["paypal_client_secret"] = new(Secret: true),
        ["paypal_webhook_id"] = new(),
        ["paypal_product_id"] = new(),
        ["paypal_plan_monthly"] = new(),
        ["paypal_plan_yearly"] = new(),

        ["manual_enabled"] = new("0"),
        ["manual_label"] = new("Bank transfer / JazzCash / Easypaisa"),
        ["manual_methods"] = new("Bank transfer, JazzCash, Easypaisa"),
        ["manual_price_monthly"] = new(""),
        ["manual_price_yearly"] = new(""),
        ["manual_instructions"] = new(""),
    };

    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(30);
    private (DateTime At, Dictionary<string, string> Values)? _cache;

    // Same key derivation and "enc:iv:tag:data" format as the Next.js app, so saved secrets are portable.
    private byte[] Key => SHA256.HashData(Encoding.UTF8.GetBytes($"settings:{auth.Value.Secret}"));

    private string Encrypt(string text)
    {
        var iv = RandomNumberGenerator.GetBytes(12);
        var plain = Encoding.UTF8.GetBytes(text);
        var cipher = new byte[plain.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(Key, 16);
        aes.Encrypt(iv, plain, cipher, tag);
        return $"enc:{Convert.ToBase64String(iv)}:{Convert.ToBase64String(tag)}:{Convert.ToBase64String(cipher)}";
    }

    private string Decrypt(string value)
    {
        if (!value.StartsWith("enc:")) return value;
        try
        {
            var parts = value.Split(':');
            var iv = Convert.FromBase64String(parts[1]);
            var tag = Convert.FromBase64String(parts[2]);
            var cipher = Convert.FromBase64String(parts[3]);
            var plain = new byte[cipher.Length];
            using var aes = new AesGcm(Key, 16);
            aes.Decrypt(iv, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch
        {
            log.LogError("A saved secret could not be decrypted (was Auth:Secret changed?). Re-enter it in the admin panel.");
            return "";
        }
    }

    /// <summary>All settings as plain strings (secrets decrypted).</summary>
    public async Task<IReadOnlyDictionary<string, string>> GetAllAsync()
    {
        if (_cache is { } c && c.At > DateTime.UtcNow - Ttl) return c.Values;
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Settings.AsNoTracking().ToDictionaryAsync(x => x.Key, x => x.Value);
        var values = new Dictionary<string, string>();
        foreach (var (key, def) in Definitions)
        {
            if (saved.TryGetValue(key, out var v)) values[key] = def.Secret ? Decrypt(v) : v;
            else values[key] = (def.Env is null ? null : Environment.GetEnvironmentVariable(def.Env)) is { Length: > 0 } env ? env : def.Default ?? "";
        }
        _cache = (DateTime.UtcNow, values);
        return values;
    }

    public async Task<string> GetAsync(string key) => (await GetAllAsync()).GetValueOrDefault(key, "");

    /// <summary>Save some settings. Unknown keys are ignored; empty secret fields are skipped so a saved key is never wiped by accident.</summary>
    public async Task SaveAsync(IDictionary<string, string?> values)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var (key, raw) in values)
        {
            if (!Definitions.TryGetValue(key, out var def)) continue;
            var value = (raw ?? "").Trim();
            if (def.Secret && value.Length == 0) continue;
            var stored = def.Secret ? Encrypt(value) : value;
            var row = await db.Settings.FindAsync(key);
            if (row is null) db.Settings.Add(new Setting { Key = key, Value = stored });
            else row.Value = stored;
        }
        await db.SaveChangesAsync();
        _cache = null;
    }

    public async Task ClearAsync(string key)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.Settings.FindAsync(key);
        if (row is null) db.Settings.Add(new Setting { Key = key, Value = "" });
        else row.Value = "";
        await db.SaveChangesAsync();
        _cache = null;
    }

    /// <summary>Settings for the admin panel: secrets are never sent back, only whether one is saved.</summary>
    public async Task<Dictionary<string, object>> GetForAdminAsync()
    {
        var all = await GetAllAsync();
        return Definitions.ToDictionary(d => d.Key, d => d.Value.Secret ? (object)new { saved = all[d.Key].Length > 0 } : all[d.Key]);
    }

    private static decimal Money(string v, decimal fallback) =>
        decimal.TryParse(v, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) && n > 0 ? Math.Round(n, 2) : fallback;

    public async Task<PlansInfo> GetPlansAsync()
    {
        var s = await GetAllAsync();
        var monthly = Money(s["price_monthly"], 5.99m);
        var yearly = Money(s["price_yearly"], 47.99m);
        var save = (int)Math.Round((1 - yearly / (monthly * 12)) * 100);
        return new PlansInfo(
            (s["currency"] is { Length: > 0 } cur ? cur : "USD").ToUpperInvariant(),
            new PlanInfo(Plans.Monthly, "Monthly", monthly, "month", monthly, "Billed monthly. Cancel anytime."),
            new PlanInfo(Plans.Yearly, "Yearly", yearly, "year", Math.Round(yearly / 12, 2), save > 0 ? $"Save {save}% compared to monthly." : "Billed yearly."));
    }

    public async Task<bool> IsFreeModeAsync() => await GetAsync("free_mode") == "1";

    public async Task<int> GetDailyLimitAsync() =>
        int.TryParse(await GetAsync("pro_daily_limit"), out var n) && n > 0 ? n : 200;

    /// <summary>Which checkout options are switched on and fully configured.</summary>
    public async Task<PaymentMethodsInfo> GetPaymentMethodsAsync()
    {
        var s = await GetAllAsync();
        bool Set(string k) => s[k].Length > 0;
        return new PaymentMethodsInfo(
            Stripe: s["stripe_enabled"] == "1" && Set("stripe_secret_key") && Set("stripe_price_monthly") && Set("stripe_price_yearly"),
            Paypal: s["paypal_enabled"] == "1" && Set("paypal_client_id") && Set("paypal_client_secret") && Set("paypal_plan_monthly") && Set("paypal_plan_yearly"),
            Manual: s["manual_enabled"] == "1" && s["manual_instructions"].Trim().Length > 0,
            ManualLabel: s["manual_label"]);
    }

    public async Task<string[]> GetManualMethodsAsync() =>
        (await GetAsync("manual_methods")).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
}

public record PlanInfo(string Id, string Label, decimal Price, string Period, decimal PerMonth, string Note);
public record PlansInfo(string Currency, PlanInfo Monthly, PlanInfo Yearly);
public record PaymentMethodsInfo(bool Stripe, bool Paypal, bool Manual, string ManualLabel);
