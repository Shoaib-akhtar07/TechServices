using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers.Admin;

public record RejectRequest(string? AdminNote);

[ApiController]
[Route("api/admin/payments")]
[Require(Roles.Admin)]
public partial class AdminPaymentsController(AppDbContext db, CurrentUser current, SubscriptionService subs, SettingsService settings) : ControllerBase
{
    [GeneratedRegex(@"[\d.,]+")] private static partial Regex Number();
    [GeneratedRegex(@"[A-Za-z]{3}")] private static partial Regex CurrencyCode();

    /// <summary>Manual payments waiting for review (or filter with status=approved|rejected|all).</summary>
    [HttpGet("manual")]
    public async Task<IActionResult> Manual(string status = "pending", int page = 1, int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var query = db.ManualPayments.AsNoTracking().Include(x => x.User).AsQueryable();
        if (status != "all") query = query.Where(x => x.Status == status);
        var total = await query.CountAsync();
        // Pending: oldest first (review in order); reviewed: newest first.
        query = status == "pending" ? query.OrderBy(x => x.CreatedAt) : query.OrderByDescending(x => x.CreatedAt);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new { x.Id, x.Plan, x.Amount, x.Method, x.Reference, x.Note, x.Status, x.AdminNote, x.ReviewedBy, x.ReviewedAt, x.CreatedAt, user = new { x.User!.Id, x.User.Email, x.User.Name } })
            .ToListAsync();
        var counts = await db.ManualPayments.GroupBy(x => x.Status).Select(g => new { status = g.Key, count = g.Count() }).ToDictionaryAsync(x => x.status, x => x.count);
        return Ok(new { page, pageSize, total, counts, items });
    }

    [HttpPost("manual/{id}/approve")]
    public async Task<IActionResult> Approve(string id)
    {
        var me = (await current.GetAsync())!;
        // Only a pending payment can be approved, and only once (guards against double clicks).
        var count = await db.ManualPayments.Where(x => x.Id == id && x.Status == "pending").ExecuteUpdateAsync(s => s
            .SetProperty(x => x.Status, "approved")
            .SetProperty(x => x.ReviewedBy, me.Email)
            .SetProperty(x => x.ReviewedAt, DateTime.UtcNow));
        if (count == 0) return Conflict(new { error = "This payment was already reviewed." });

        var p = await db.ManualPayments.AsNoTracking().FirstAsync(x => x.Id == id);
        var sub = await subs.ExtendAsync(p.UserId, p.Plan, Plans.Days(p.Plan), Providers.Manual);

        // "PKR 1,700" → 1700 PKR, for the revenue view.
        var amount = decimal.TryParse(Number().Match(p.Amount).Value.Replace(",", ""), NumberStyles.Number, CultureInfo.InvariantCulture, out var a) ? a : 0;
        var currency = CurrencyCode().Match(p.Amount) is { Success: true } m ? m.Value : await settings.GetAsync("currency");
        await subs.RecordPaymentAsync(p.UserId, Providers.Manual, p.Id, p.Plan, amount, currency);
        return Ok(new { message = "Payment approved — Pro is active.", sub.CurrentPeriodEnd });
    }

    [HttpPost("manual/{id}/reject")]
    public async Task<IActionResult> Reject(string id, RejectRequest req)
    {
        var me = (await current.GetAsync())!;
        var note = (req.AdminNote ?? "").Trim();
        if (note.Length > 300) note = note[..300];
        var count = await db.ManualPayments.Where(x => x.Id == id && x.Status == "pending").ExecuteUpdateAsync(s => s
            .SetProperty(x => x.Status, "rejected")
            .SetProperty(x => x.AdminNote, note.Length > 0 ? note : null)
            .SetProperty(x => x.ReviewedBy, me.Email)
            .SetProperty(x => x.ReviewedAt, DateTime.UtcNow));
        return count == 0 ? Conflict(new { error = "This payment was already reviewed." }) : Ok(new { message = "Payment rejected." });
    }

    /// <summary>All recorded payments (Stripe invoices, PayPal sales, approved manual payments).</summary>
    [HttpGet("history")]
    public async Task<IActionResult> History(string? provider = null, int page = 1, int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var query = db.PaymentRecords.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(provider)) query = query.Where(x => x.Provider == provider);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new { x.Id, x.Provider, x.ExternalId, x.Plan, x.Amount, x.Currency, x.CreatedAt, user = new { x.User!.Id, x.User.Email } })
            .ToListAsync();
        return Ok(new { page, pageSize, total, items });
    }
}
