using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers.Admin;

public record GrantProRequest(string? Plan, int? Days);
public record SetRoleRequest(string? Role);
public record CreateUserRequest(string? Email, string? Name, string? Password, string? Role);
public record UpdateUserRequest(string? Email, string? Name);
public record SetPasswordRequest(string? Password);
public record SuspendRequest(bool Suspended);

[ApiController]
[Route("api/admin")]
[Require(Roles.Admin)]
public partial class AdminUsersController(AppDbContext db, CurrentUser current, SubscriptionService subs, StripeService stripe, PaypalService paypal, ILogger<AdminUsersController> log) : ControllerBase
{
    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")] private static partial Regex EmailFormat();

    private static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();

    private static string? CleanName(string? name)
    {
        var n = (name ?? "").Trim();
        return n.Length == 0 ? null : n.Length > 80 ? n[..80] : n;
    }

    private async Task<string?> EmailProblemAsync(string email, string? exceptId = null)
    {
        if (email.Length > 254 || !EmailFormat().IsMatch(email)) return "Please enter a valid email address.";
        if (await db.Users.AnyAsync(x => x.Email == email && x.Id != exceptId)) return "Another account already uses this email.";
        return null;
    }

    private static string? PasswordProblem(string? password) =>
        (password ?? "").Length is < 8 or > 72 ? "The password must be 8 to 72 characters." : null;

    /// <summary>Dashboard numbers.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var revenue = await db.PaymentRecords.Where(x => x.CreatedAt >= monthStart)
            .GroupBy(x => x.Currency).Select(g => new { currency = g.Key, amount = g.Sum(x => x.Amount), count = g.Count() }).ToListAsync();
        var recent = await db.Users.AsNoTracking().Include(x => x.Subscription).OrderByDescending(x => x.CreatedAt).Take(6).ToListAsync();
        return Ok(new
        {
            users = await db.Users.CountAsync(),
            newUsers7d = await db.Users.CountAsync(x => x.CreatedAt >= now.AddDays(-7)),
            newUsers30d = await db.Users.CountAsync(x => x.CreatedAt >= now.AddDays(-30)),
            // For the recurring revenue estimate: active subscriptions per plan and provider.
            activeByPlan = await db.Subscriptions.Where(x => (x.Status == "active" || x.Status == "trialing") && x.CurrentPeriodEnd > now)
                .GroupBy(x => new { x.Plan, x.Provider }).Select(g => new { g.Key.Plan, g.Key.Provider, count = g.Count() }).ToListAsync(),
            recentUsers = recent.Select(u => new { u.Id, u.Email, u.CreatedAt, pro = u.Subscription?.IsActive == true }),
            activeSubscriptions = await db.Subscriptions.CountAsync(x => (x.Status == "active" || x.Status == "trialing") && x.CurrentPeriodEnd > now),
            byProvider = await db.Subscriptions.Where(x => (x.Status == "active" || x.Status == "trialing") && x.CurrentPeriodEnd > now)
                .GroupBy(x => x.Provider).Select(g => new { provider = g.Key, count = g.Count() }).ToListAsync(),
            pendingManualPayments = await db.ManualPayments.CountAsync(x => x.Status == "pending"),
            revenueThisMonth = revenue,
            posts = new
            {
                total = await db.Posts.CountAsync(),
                published = await db.Posts.CountAsync(x => x.Published && x.PublishedAt <= now),
                drafts = await db.Posts.CountAsync(x => !x.Published),
            },
        });
    }

    /// <summary>
    /// Day-by-day sign-ups, Pro jobs and revenue for the last `days` days (7, 30 or 90; UTC days, today included),
    /// with totals for the period before it so the dashboard can show the change.
    /// </summary>
    [HttpGet("stats/activity")]
    public async Task<IActionResult> Activity(int days = 30)
    {
        days = days is 7 or 90 ? days : 30;
        var today = DateTime.UtcNow.Date;
        var from = today.AddDays(-(days - 1));
        var prevFrom = from.AddDays(-days);
        static string Key(DateTime d) => d.ToString("yyyy-MM-dd");

        // Small rows only (dates and numbers); grouped here so it works the same on SQLite and SQL Server.
        var signups = await db.Users.AsNoTracking().Where(x => x.CreatedAt >= prevFrom).Select(x => x.CreatedAt).ToListAsync();
        var prevFromKey = Key(prevFrom);
        var usage = await db.Usage.AsNoTracking().Where(x => string.Compare(x.Day, prevFromKey) >= 0)
            .Select(x => new { x.Day, x.Count, x.UserId }).ToListAsync();
        var payments = await db.PaymentRecords.AsNoTracking().Where(x => x.CreatedAt >= prevFrom)
            .Select(x => new { x.CreatedAt, x.Amount, x.Currency }).ToListAsync();

        var signupsByDay = signups.Where(d => d >= from).GroupBy(d => Key(d.Date)).ToDictionary(g => g.Key, g => g.Count());
        var jobsByDay = usage.Where(x => string.Compare(x.Day, Key(from)) >= 0).GroupBy(x => x.Day).ToDictionary(g => g.Key, g => g.Sum(x => x.Count));
        var revenueByDay = payments.Where(x => x.CreatedAt >= from).GroupBy(x => Key(x.CreatedAt.Date))
            .ToDictionary(g => g.Key, g => g.GroupBy(x => x.Currency).ToDictionary(c => c.Key, c => c.Sum(x => x.Amount)));

        object Totals(DateTime start, DateTime end) => new
        {
            signups = signups.Count(d => d >= start && d < end),
            jobs = usage.Where(x => string.Compare(x.Day, Key(start)) >= 0 && string.Compare(x.Day, Key(end)) < 0).Sum(x => x.Count),
            revenue = payments.Where(x => x.CreatedAt >= start && x.CreatedAt < end)
                .GroupBy(x => x.Currency).ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)),
            payments = payments.Count(x => x.CreatedAt >= start && x.CreatedAt < end),
        };

        var top = usage.Where(x => string.Compare(x.Day, Key(from)) >= 0)
            .GroupBy(x => x.UserId).Select(g => new { userId = g.Key, jobs = g.Sum(x => x.Count) })
            .OrderByDescending(x => x.jobs).Take(5).ToList();
        var topIds = top.Select(x => x.userId).ToList();
        var emails = await db.Users.AsNoTracking().Where(x => topIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => new { x.Email, x.Name });

        var recentPayments = await db.PaymentRecords.AsNoTracking().Include(x => x.User).OrderByDescending(x => x.CreatedAt).Take(6)
            .Select(x => new { x.Id, x.Provider, x.Plan, x.Amount, x.Currency, x.CreatedAt, email = x.User != null ? x.User.Email : null })
            .ToListAsync();

        return Ok(new
        {
            days,
            from = Key(from),
            series = Enumerable.Range(0, days).Select(i =>
            {
                var k = Key(from.AddDays(i));
                return new
                {
                    date = k,
                    signups = signupsByDay.GetValueOrDefault(k),
                    jobs = jobsByDay.GetValueOrDefault(k),
                    revenue = revenueByDay.GetValueOrDefault(k) ?? new Dictionary<string, decimal>(),
                };
            }),
            current = Totals(from, today.AddDays(1)),
            previous = Totals(prevFrom, from),
            topUsers = top.Select(x => new { x.userId, x.jobs, email = emails.GetValueOrDefault(x.userId)?.Email, name = emails.GetValueOrDefault(x.userId)?.Name }),
            recentPayments,
            suspended = await db.Users.CountAsync(x => x.SuspendedAt != null),
        });
    }

    [HttpGet("users")]
    /// <summary>Users, newest first. filter = all | pro | free | admin | author.</summary>
    public async Task<IActionResult> Users(string? q = null, string? filter = null, int page = 1, int pageSize = 25)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var now = DateTime.UtcNow;
        var query = db.Users.AsNoTracking().Include(x => x.Subscription).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(x => x.Email.Contains(term) || (x.Name != null && x.Name.ToLower().Contains(term)));
        }
        query = filter switch
        {
            "pro" => query.Where(x => x.Subscription != null && (x.Subscription.Status == "active" || x.Subscription.Status == "trialing") && x.Subscription.CurrentPeriodEnd > now),
            "free" => query.Where(x => x.Subscription == null || !((x.Subscription.Status == "active" || x.Subscription.Status == "trialing") && x.Subscription.CurrentPeriodEnd > now)),
            "admin" => query.Where(x => x.Role == Roles.Admin),
            "author" => query.Where(x => x.Role == Roles.Author),
            "suspended" => query.Where(x => x.SuspendedAt != null),
            _ => query,
        };
        var total = await query.CountAsync();
        var users = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var ids = users.Select(u => u.Id).ToList();
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var usage = await db.Usage.AsNoTracking().Where(x => ids.Contains(x.UserId))
            .GroupBy(x => x.UserId)
            .Select(g => new { g.Key, total = g.Sum(x => x.Count), today = g.Where(x => x.Day == today).Sum(x => x.Count) })
            .ToDictionaryAsync(x => x.Key);
        return Ok(new
        {
            page, pageSize, total,
            items = users.Select(u => new
            {
                u.Id, u.Email, u.Name, u.Role, u.CreatedAt, u.SuspendedAt,
                admin = current.IsAdmin(u),
                usage = new { today = usage.GetValueOrDefault(u.Id)?.today ?? 0, total = usage.GetValueOrDefault(u.Id)?.total ?? 0 },
                subscription = u.Subscription is { } s
                    ? new { s.Provider, s.Status, s.Plan, s.CurrentPeriodEnd, s.CancelAtPeriodEnd, active = s.IsActive, s.StripeSubscriptionId, s.PaypalSubscriptionId }
                    : null,
            }),
        });
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(CreateUserRequest req)
    {
        var email = NormalizeEmail(req.Email);
        if (await EmailProblemAsync(email) is { } emailError) return BadRequest(new { error = emailError });
        if (PasswordProblem(req.Password) is { } passwordError) return BadRequest(new { error = passwordError });
        var role = req.Role is not null && Roles.All.Contains(req.Role) ? req.Role : Roles.User;
        var user = new User { Email = email, Name = CleanName(req.Name), Role = role, PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12) };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        log.LogInformation("[admin] {Admin} created user {User} ({Role})", (await current.GetAsync())!.Email, email, role);
        return Ok(new { message = $"Account {email} created.", user.Id });
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { error = "User not found." });
        var email = NormalizeEmail(req.Email);
        if (email != user.Email && await EmailProblemAsync(email, id) is { } emailError) return BadRequest(new { error = emailError });
        user.Email = email;
        user.Name = CleanName(req.Name);
        await db.SaveChangesAsync();
        return Ok(new { message = "Account details saved." });
    }

    [HttpPost("users/{id}/password")]
    public async Task<IActionResult> SetPassword(string id, SetPasswordRequest req)
    {
        if (PasswordProblem(req.Password) is { } passwordError) return BadRequest(new { error = passwordError });
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { error = "User not found." });
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12);
        await db.SaveChangesAsync();
        log.LogInformation("[admin] {Admin} set a new password for {User}", (await current.GetAsync())!.Email, id);
        return Ok(new { message = $"New password set for {user.Email}." });
    }

    [HttpPost("users/{id}/suspend")]
    public async Task<IActionResult> Suspend(string id, SuspendRequest req)
    {
        var me = (await current.GetAsync())!;
        if (id == me.Id) return BadRequest(new { error = "You cannot suspend your own account." });
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { error = "User not found." });
        user.SuspendedAt = req.Suspended ? DateTime.UtcNow : null;
        await db.SaveChangesAsync();
        log.LogInformation("[admin] {Admin} {Action} {User}", me.Email, req.Suspended ? "suspended" : "unsuspended", id);
        return Ok(new { message = req.Suspended ? $"{user.Email} is suspended and can no longer log in." : $"{user.Email} can log in again." });
    }

    [HttpPost("users/{id}/grant-pro")]
    public async Task<IActionResult> GrantPro(string id, GrantProRequest req)
    {
        var plan = Plans.Normalize(req.Plan);
        var days = req.Days ?? Plans.Days(plan);
        if (days is < 1 or > 3660) return BadRequest(new { error = "Days must be between 1 and 3660." });
        if (!await db.Users.AnyAsync(x => x.Id == id)) return NotFound(new { error = "User not found." });
        var sub = await subs.ExtendAsync(id, plan, days, Providers.Admin);
        log.LogInformation("[admin] {Admin} granted {Days} days of Pro to {User}", (await current.GetAsync())!.Email, days, id);
        return Ok(new { message = $"Pro granted for {days} days.", sub.CurrentPeriodEnd });
    }

    [HttpPost("users/{id}/revoke-pro")]
    public async Task<IActionResult> RevokePro(string id)
    {
        var sub = await db.Subscriptions.FirstOrDefaultAsync(x => x.UserId == id);
        if (sub is null) return BadRequest(new { error = "This user has no subscription." });

        // Stop the provider from charging again, otherwise the next renewal would turn Pro back on.
        string? warning = null;
        try
        {
            if (sub.Provider == Providers.Stripe && sub.StripeSubscriptionId is { } sid && await stripe.ClientAsync() is not null)
                await stripe.CancelAsync(sid);
            if (sub.Provider == Providers.Paypal && sub.PaypalSubscriptionId is { } pid)
                await paypal.CancelAsync(pid, "Cancelled by admin");
        }
        catch (Exception e)
        {
            warning = $"Could not cancel at {sub.Provider} ({e.Message}) — cancel it in their dashboard too.";
        }
        // The PayPal sync above may have replaced the tracked row's values; reload before ending it.
        await db.Entry(sub).ReloadAsync();
        sub.Status = "canceled";
        sub.CurrentPeriodEnd = DateTime.UtcNow;
        sub.CancelAtPeriodEnd = false;
        await db.SaveChangesAsync();
        log.LogInformation("[admin] {Admin} revoked Pro for {User}", (await current.GetAsync())!.Email, id);
        return Ok(new { message = "Pro removed.", warning });
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> SetRole(string id, SetRoleRequest req)
    {
        var me = (await current.GetAsync())!;
        if (req.Role is null || !Roles.All.Contains(req.Role)) return BadRequest(new { error = "Role must be user, author or admin." });
        if (id == me.Id && req.Role != Roles.Admin) return BadRequest(new { error = "You cannot remove your own admin access." });
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { error = "User not found." });
        user.Role = req.Role;
        await db.SaveChangesAsync();
        return Ok(new { message = $"Role changed to {req.Role}." });
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var me = (await current.GetAsync())!;
        if (id == me.Id) return BadRequest(new { error = "You cannot delete your own account here." });
        var user = await db.Users.Include(x => x.Subscription).FirstOrDefaultAsync(x => x.Id == id);
        if (user is null) return NotFound(new { error = "User not found." });
        if (user.Subscription is { Status: "active" or "trialing" or "past_due", Provider: Providers.Stripe or Providers.Paypal })
            return BadRequest(new { error = "This user still has a paid subscription. Remove Pro first so they are not charged again." });
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        log.LogInformation("[admin] {Admin} deleted user {User}", me.Email, id);
        return NoContent();
    }
}
