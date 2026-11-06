using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers.Admin;

public record GrantProRequest(string? Plan, int? Days);
public record SetRoleRequest(string? Role);

[ApiController]
[Route("api/admin")]
[Require(Roles.Admin)]
public class AdminUsersController(AppDbContext db, CurrentUser current, SubscriptionService subs, StripeService stripe, PaypalService paypal, ILogger<AdminUsersController> log) : ControllerBase
{
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
            _ => query,
        };
        var total = await query.CountAsync();
        var users = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new
        {
            page, pageSize, total,
            items = users.Select(u => new
            {
                u.Id, u.Email, u.Name, u.Role, u.CreatedAt,
                admin = current.IsAdmin(u),
                subscription = u.Subscription is { } s
                    ? new { s.Provider, s.Status, s.Plan, s.CurrentPeriodEnd, s.CancelAtPeriodEnd, active = s.IsActive, s.StripeSubscriptionId, s.PaypalSubscriptionId }
                    : null,
            }),
        });
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
