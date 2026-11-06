using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;

namespace SoftServices.Api.Services;

public record SubscriptionData(
    string Provider,
    string Status,
    string Plan,
    DateTime CurrentPeriodEnd,
    bool CancelAtPeriodEnd = false,
    string? StripeSubscriptionId = null,
    string? PaypalSubscriptionId = null)
{
    public bool IsActive => (Status is "active" or "trialing") && CurrentPeriodEnd > DateTime.UtcNow;
}

public class SubscriptionService(AppDbContext db, SettingsService settings)
{
    /// <summary>
    /// Store a user's subscription (one row per user). A stale or abandoned checkout from one provider
    /// never overwrites an active subscription that came from somewhere else.
    /// </summary>
    public async Task<Subscription> SaveAsync(string userId, SubscriptionData data)
    {
        var current = await db.Subscriptions.FirstOrDefaultAsync(x => x.UserId == userId);
        var sameSub = current is not null && current.Provider == data.Provider && data.Provider switch
        {
            Providers.Stripe => current.StripeSubscriptionId == data.StripeSubscriptionId,
            Providers.Paypal => current.PaypalSubscriptionId == data.PaypalSubscriptionId,
            _ => true,
        };
        if (current is not null && !sameSub && current.IsActive && !data.IsActive) return current;

        if (current is null)
        {
            current = new Subscription { UserId = userId };
            db.Subscriptions.Add(current);
        }
        current.Provider = data.Provider;
        current.Status = data.Status;
        current.Plan = data.Plan;
        current.CurrentPeriodEnd = data.CurrentPeriodEnd;
        current.CancelAtPeriodEnd = data.CancelAtPeriodEnd;
        current.StripeSubscriptionId = data.StripeSubscriptionId;
        current.PaypalSubscriptionId = data.PaypalSubscriptionId;
        await db.SaveChangesAsync();
        return current;
    }

    /// <summary>Add Pro time without a payment provider (approved manual payment or admin grant).</summary>
    public async Task<Subscription> ExtendAsync(string userId, string plan, int days, string provider)
    {
        var current = await db.Subscriptions.FirstOrDefaultAsync(x => x.UserId == userId);
        // Renewing early adds to the time already paid for, unless it is tied to an auto-renewing provider.
        var keep = current is not null && current.IsActive && current.Provider is Providers.Manual or Providers.Admin;
        var from = keep ? current!.CurrentPeriodEnd : DateTime.UtcNow;
        if (current is null)
        {
            current = new Subscription { UserId = userId };
            db.Subscriptions.Add(current);
        }
        current.Provider = provider;
        current.Plan = plan;
        current.Status = "active";
        current.CurrentPeriodEnd = from.AddDays(days);
        current.CancelAtPeriodEnd = false;
        current.StripeSubscriptionId = null;
        current.PaypalSubscriptionId = null;
        await db.SaveChangesAsync();
        return current;
    }

    /// <summary>Record a successful payment once (webhooks can be delivered more than once).</summary>
    public async Task RecordPaymentAsync(string userId, string provider, string externalId, string plan, decimal amount, string currency)
    {
        if (string.IsNullOrEmpty(externalId)) return;
        if (await db.PaymentRecords.AnyAsync(x => x.Provider == provider && x.ExternalId == externalId)) return;
        db.PaymentRecords.Add(new PaymentRecord { UserId = userId, Provider = provider, ExternalId = externalId, Plan = plan, Amount = amount, Currency = currency.ToUpperInvariant() });
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException) { /* the same event arrived twice at once */ }
    }

    public static string Today => DateTime.UtcNow.ToString("yyyy-MM-dd");

    public async Task<int> UsageTodayAsync(string userId) =>
        await db.Usage.Where(x => x.UserId == userId && x.Day == Today).Select(x => x.Count).FirstOrDefaultAsync();

    /// <summary>Count <paramref name="n"/> Pro jobs for today. Returns false (and counts nothing) if that would pass the limit.</summary>
    public async Task<bool> ConsumeAsync(string userId, int n = 1)
    {
        var day = Today;
        var row = await db.Usage.FirstOrDefaultAsync(x => x.UserId == userId && x.Day == day);
        if ((row?.Count ?? 0) + n > await settings.GetDailyLimitAsync()) return false;
        if (row is null) db.Usage.Add(new Usage { UserId = userId, Day = day, Count = n });
        else row.Count += n;
        await db.SaveChangesAsync();
        return true;
    }
}
