using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;
using S = Stripe;

namespace SoftServices.Api.Services;

/// <summary>Stripe card payments. Keys and price IDs come from the admin settings.</summary>
public class StripeService(AppDbContext db, SettingsService settings, SubscriptionService subs, ILogger<StripeService> log)
{
    public async Task<S.StripeClient?> ClientAsync()
    {
        var key = await settings.GetAsync("stripe_secret_key");
        return key.Length == 0 ? null : new S.StripeClient(key);
    }

    private async Task<S.StripeClient> RequireClientAsync() =>
        await ClientAsync() ?? throw new InvalidOperationException("Save the Stripe secret key first.");

    /// <summary>The user's Stripe customer id, creating the customer on first checkout.</summary>
    public async Task<string> EnsureCustomerAsync(User user)
    {
        if (user.StripeCustomerId is { } id) return id;
        var client = await RequireClientAsync();
        var customer = await new S.CustomerService(client).CreateAsync(new S.CustomerCreateOptions
        {
            Email = user.Email,
            Name = user.Name,
            Metadata = new() { ["userId"] = user.Id },
        });
        user.StripeCustomerId = customer.Id;
        await db.SaveChangesAsync();
        return customer.Id;
    }

    public async Task<string> CreateCheckoutAsync(User user, string plan, string frontendUrl)
    {
        var client = await RequireClientAsync();
        var price = await settings.GetAsync(plan == Plans.Yearly ? "stripe_price_yearly" : "stripe_price_monthly");
        var session = await new S.Checkout.SessionService(client).CreateAsync(new S.Checkout.SessionCreateOptions
        {
            Mode = "subscription",
            Customer = await EnsureCustomerAsync(user),
            ClientReferenceId = user.Id,
            LineItems = [new() { Price = price, Quantity = 1 }],
            SubscriptionData = new() { Metadata = new() { ["userId"] = user.Id } },
            AllowPromotionCodes = true,
            SuccessUrl = $"{frontendUrl}/account/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{frontendUrl}/pricing/",
        });
        return session.Url;
    }

    /// <summary>Stripe's hosted billing portal: change plan, update card, invoices, cancel.</summary>
    public async Task<string> CreatePortalAsync(User user, string frontendUrl)
    {
        var client = await RequireClientAsync();
        if (user.StripeCustomerId is null) throw new InvalidOperationException("No billing account found.");
        var portal = await new S.BillingPortal.SessionService(client).CreateAsync(new S.BillingPortal.SessionCreateOptions
        {
            Customer = user.StripeCustomerId,
            ReturnUrl = $"{frontendUrl}/account/",
        });
        return portal.Url;
    }

    /// <summary>Mirror a Stripe subscription into our database.</summary>
    public async Task SyncSubscriptionAsync(S.Subscription sub)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.StripeCustomerId == sub.CustomerId);
        if (user is null && sub.Metadata?.GetValueOrDefault("userId") is { } uid)
            user = await db.Users.FirstOrDefaultAsync(x => x.Id == uid);
        if (user is null) throw new InvalidOperationException($"No user for Stripe customer {sub.CustomerId}");

        var item = sub.Items?.Data?.FirstOrDefault();
        var interval = item?.Price?.Recurring?.Interval;
        var periodEnd = item?.CurrentPeriodEnd ?? DateTime.UtcNow;
        await subs.SaveAsync(user.Id, new SubscriptionData(
            Providers.Stripe,
            sub.Status,
            interval == "year" ? Plans.Yearly : Plans.Monthly,
            DateTime.SpecifyKind(periodEnd, DateTimeKind.Utc),
            sub.CancelAtPeriodEnd,
            StripeSubscriptionId: sub.Id));
    }

    /// <summary>
    /// After checkout, pull the subscription straight from Stripe so Pro is active right away, even
    /// before (or without) the webhook. Only accepts a completed session that belongs to this user.
    /// </summary>
    public async Task<bool> SyncCheckoutSessionAsync(string sessionId, string userId)
    {
        var client = await ClientAsync();
        if (client is null || !sessionId.StartsWith("cs_")) return false;
        try
        {
            var session = await new S.Checkout.SessionService(client).GetAsync(sessionId, new() { Expand = ["subscription"] });
            if (session.ClientReferenceId != userId || session.Status != "complete" || session.Subscription is null) return false;
            await SyncSubscriptionAsync(session.Subscription);
            return true;
        }
        catch (Exception e)
        {
            log.LogError(e, "Stripe checkout sync failed");
            return false;
        }
    }

    public async Task HandleWebhookAsync(string json, string? signature)
    {
        var client = await RequireClientAsync();
        var secret = await settings.GetAsync("stripe_webhook_secret");
        if (secret.Length == 0) throw new InvalidOperationException("Stripe webhook secret is not set.");
        // Throws StripeException when the signature is wrong.
        var ev = S.EventUtility.ConstructEvent(json, signature, secret, throwOnApiVersionMismatch: false);

        switch (ev.Type)
        {
            case S.EventTypes.CheckoutSessionCompleted when ev.Data.Object is S.Checkout.Session s && s.Mode == "subscription" && s.SubscriptionId is { } subId:
                await SyncSubscriptionAsync(await new S.SubscriptionService(client).GetAsync(subId));
                break;
            case S.EventTypes.CustomerSubscriptionCreated or S.EventTypes.CustomerSubscriptionUpdated or S.EventTypes.CustomerSubscriptionDeleted
                when ev.Data.Object is S.Subscription sub:
                await SyncSubscriptionAsync(sub);
                break;
            case S.EventTypes.InvoicePaid when ev.Data.Object is S.Invoice inv && inv.AmountPaid > 0:
                var user = await db.Users.FirstOrDefaultAsync(x => x.StripeCustomerId == inv.CustomerId);
                if (user is null) break;
                var plan = await db.Subscriptions.Where(x => x.UserId == user.Id).Select(x => x.Plan).FirstOrDefaultAsync() ?? Plans.Monthly;
                await subs.RecordPaymentAsync(user.Id, Providers.Stripe, inv.Id, plan, inv.AmountPaid / 100m, inv.Currency);
                break;
        }
    }

    public async Task CancelAsync(string subscriptionId)
    {
        var client = await RequireClientAsync();
        await new S.SubscriptionService(client).CancelAsync(subscriptionId);
    }

    /// <summary>Admin: check the key works.</summary>
    public async Task TestAsync()
    {
        var client = await RequireClientAsync();
        await new S.BalanceService(client).GetAsync();
    }

    /// <summary>Admin: create a product with monthly + yearly prices from the configured amounts.</summary>
    public async Task<(string Monthly, string Yearly)> CreatePricesAsync(decimal monthly, decimal yearly, string currency, string name)
    {
        var client = await RequireClientAsync();
        var product = await new S.ProductService(client).CreateAsync(new S.ProductCreateOptions { Name = name });
        var prices = new S.PriceService(client);
        Task<S.Price> Make(decimal amount, string interval) => prices.CreateAsync(new S.PriceCreateOptions
        {
            Product = product.Id,
            Currency = currency.ToLowerInvariant(),
            UnitAmount = (long)Math.Round(amount * 100),
            Recurring = new() { Interval = interval },
        });
        var m = await Make(monthly, "month");
        var y = await Make(yearly, "year");
        return (m.Id, y.Id);
    }
}
