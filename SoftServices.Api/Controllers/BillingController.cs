using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers;

public record PlanRequest(string? Plan);
public record StripeSyncRequest(string? SessionId);
public record PaypalSyncRequest(string? SubscriptionId);
public record ManualPaymentRequest(string? Plan, string? Method, string? Reference, string? Note);

[ApiController]
[Route("api/billing")]
public class BillingController(
    AppDbContext db,
    CurrentUser current,
    SettingsService settings,
    SubscriptionService subs,
    StripeService stripe,
    PaypalService paypal,
    IOptions<AppOptions> app,
    IHostEnvironment env,
    ILogger<BillingController> log) : ControllerBase
{
    private string Front => app.Value.FrontendUrl.TrimEnd('/');

    /// <summary>Public: prices, which payment methods are available and the manual-payment instructions.</summary>
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var s = await settings.GetAllAsync();
        var methods = await settings.GetPaymentMethodsAsync();
        return Ok(new
        {
            freeMode = s["free_mode"] == "1",
            plans = await settings.GetPlansAsync(),
            methods,
            manual = methods.Manual
                ? new
                {
                    label = s["manual_label"],
                    methods = await settings.GetManualMethodsAsync(),
                    instructions = s["manual_instructions"],
                    prices = new { monthly = s["manual_price_monthly"], yearly = s["manual_price_yearly"] },
                }
                : null,
            testBilling = TestBillingEnabled,
        });
    }

    // ---------- Stripe ----------

    [HttpPost("stripe/checkout")]
    [Require(Roles.User)]
    public async Task<IActionResult> StripeCheckout(PlanRequest req)
    {
        var user = (await current.GetAsync())!;
        if (user.Subscription?.IsActive == true) return Conflict(new { error = "You already have an active Pro subscription." });
        if (req.Plan is not (Plans.Monthly or Plans.Yearly)) return BadRequest(new { error = "Unknown plan." });
        if (!(await settings.GetPaymentMethodsAsync()).Stripe)
            return StatusCode(503, new { error = "Card payments are not configured yet.", code = "stripe_not_configured" });
        return Ok(new { url = await stripe.CreateCheckoutAsync(user, req.Plan, Front) });
    }

    /// <summary>Called by the account page after Stripe redirects back, so Pro turns on without waiting for the webhook.</summary>
    [HttpPost("stripe/sync")]
    [Require(Roles.User)]
    public async Task<IActionResult> StripeSync(StripeSyncRequest req)
    {
        var user = (await current.GetAsync())!;
        var ok = await stripe.SyncCheckoutSessionAsync(req.SessionId ?? "", user.Id);
        return ok ? Ok(new { ok }) : BadRequest(new { error = "This checkout is not complete yet. Refresh in a moment." });
    }

    [HttpPost("stripe/portal")]
    [Require(Roles.User)]
    public async Task<IActionResult> StripePortal()
    {
        var user = (await current.GetAsync())!;
        if (user.StripeCustomerId is null || await stripe.ClientAsync() is null) return BadRequest(new { error = "No billing account found." });
        return Ok(new { url = await stripe.CreatePortalAsync(user, Front) });
    }

    // ---------- PayPal ----------

    [HttpPost("paypal/checkout")]
    [Require(Roles.User)]
    public async Task<IActionResult> PaypalCheckout(PlanRequest req)
    {
        var user = (await current.GetAsync())!;
        if (user.Subscription?.IsActive == true) return Conflict(new { error = "You already have an active Pro subscription." });
        if (req.Plan is not (Plans.Monthly or Plans.Yearly)) return BadRequest(new { error = "Unknown plan." });
        if (!(await settings.GetPaymentMethodsAsync()).Paypal) return StatusCode(503, new { error = "PayPal is not available right now." });
        try
        {
            var (url, subscriptionId) = await paypal.CreateSubscriptionAsync(user, req.Plan);
            return Ok(new { url, subscriptionId });
        }
        catch (Exception e)
        {
            log.LogError(e, "PayPal checkout failed");
            return StatusCode(502, new { error = "Could not start PayPal checkout. Please try again." });
        }
    }

    /// <summary>Called after PayPal redirects back with ?subscription_id=… The subscription is read from PayPal and must belong to this user.</summary>
    [HttpPost("paypal/sync")]
    [Require(Roles.User)]
    public async Task<IActionResult> PaypalSync(PaypalSyncRequest req)
    {
        var user = (await current.GetAsync())!;
        if (string.IsNullOrWhiteSpace(req.SubscriptionId) || req.SubscriptionId.Length > 64) return BadRequest(new { error = "Missing subscription id." });
        try
        {
            var (userId, status) = await paypal.SyncSubscriptionAsync(req.SubscriptionId);
            if (userId != user.Id) return NotFound(new { error = "Subscription not found." });
            return Ok(new { status });
        }
        catch (Exception e)
        {
            log.LogWarning(e, "PayPal sync failed");
            return BadRequest(new { error = "Could not confirm the PayPal subscription yet. Refresh in a moment." });
        }
    }

    /// <summary>PayPal has no hosted billing portal, so customers cancel here.</summary>
    [HttpPost("paypal/cancel")]
    [Require(Roles.User)]
    public async Task<IActionResult> PaypalCancel()
    {
        var sub = (await current.GetAsync())!.Subscription;
        if (sub?.Provider != Providers.Paypal || sub.PaypalSubscriptionId is null) return BadRequest(new { error = "No PayPal subscription found." });
        try
        {
            await paypal.CancelAsync(sub.PaypalSubscriptionId);
            return Ok(new { ok = true });
        }
        catch (Exception e)
        {
            log.LogError(e, "PayPal cancel failed");
            return StatusCode(502, new { error = "Could not cancel with PayPal. Please try again or cancel from your PayPal account." });
        }
    }

    // ---------- Manual (bank / JazzCash / Easypaisa) ----------

    /// <summary>Customer reports a transfer; an admin checks it and approves it.</summary>
    [HttpPost("manual")]
    [Require(Roles.User)]
    public async Task<IActionResult> SubmitManual(ManualPaymentRequest req)
    {
        var user = (await current.GetAsync())!;
        var sub = user.Subscription;
        if (sub?.IsActive == true && sub.Provider is not (Providers.Manual or Providers.Admin))
            return Conflict(new { error = "You already have an active Pro subscription." });
        if (!(await settings.GetPaymentMethodsAsync()).Manual) return StatusCode(503, new { error = "This payment method is not available right now." });

        var plan = Plans.Normalize(req.Plan);
        var methods = await settings.GetManualMethodsAsync();
        var method = req.Method is { } m && methods.Contains(m) ? m : methods.FirstOrDefault() ?? "Manual";
        var reference = (req.Reference ?? "").Trim();
        if (reference.Length > 100) reference = reference[..100];
        var note = (req.Note ?? "").Trim();
        if (note.Length > 500) note = note[..500];
        if (reference.Length < 4) return BadRequest(new { error = "Please enter the transaction ID from your receipt." });

        if (await db.ManualPayments.AnyAsync(x => x.UserId == user.Id && x.Status == "pending"))
            return Conflict(new { error = "You already have a payment waiting for review. We will activate Pro as soon as it is checked." });
        if (await db.ManualPayments.AnyAsync(x => x.Reference == reference && x.Method == method && x.Status != "rejected"))
            return Conflict(new { error = "This transaction ID has already been submitted." });

        var amount = await settings.GetAsync(plan == Plans.Yearly ? "manual_price_yearly" : "manual_price_monthly");
        var payment = new ManualPayment { UserId = user.Id, Plan = plan, Amount = amount, Method = method, Reference = reference, Note = note.Length > 0 ? note : null };
        db.ManualPayments.Add(payment);
        await db.SaveChangesAsync();
        return Ok(new { ok = true, id = payment.Id });
    }

    /// <summary>The customer's own manual payment submissions.</summary>
    [HttpGet("manual")]
    [Require(Roles.User)]
    public async Task<IActionResult> MyManualPayments()
    {
        var id = current.Id;
        return Ok(await db.ManualPayments.Where(x => x.UserId == id).OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.Plan, x.Amount, x.Method, x.Reference, x.Status, x.AdminNote, x.CreatedAt, x.ReviewedAt })
            .ToListAsync());
    }

    /// <summary>The customer's payment history (all providers).</summary>
    [HttpGet("history")]
    [Require(Roles.User)]
    public async Task<IActionResult> History()
    {
        var id = current.Id;
        return Ok(await db.PaymentRecords.Where(x => x.UserId == id).OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.Provider, x.Plan, x.Amount, x.Currency, x.CreatedAt })
            .ToListAsync());
    }

    // ---------- Local testing ----------

    private bool TestBillingEnabled => env.IsDevelopment() && app.Value.EnableTestBilling;

    /// <summary>Development only: gives the caller 30 / 365 days of Pro without paying.</summary>
    [HttpPost("test-activate")]
    [Require(Roles.User)]
    public async Task<IActionResult> TestActivate(PlanRequest req)
    {
        if (!TestBillingEnabled) return NotFound();
        var plan = Plans.Normalize(req.Plan);
        var sub = await subs.ExtendAsync(current.Id!, plan, Plans.Days(plan), Providers.Admin);
        return Ok(new { sub.Plan, sub.CurrentPeriodEnd });
    }

    /// <summary>Development only: removes a test (admin-granted) subscription.</summary>
    [HttpPost("test-cancel")]
    [Require(Roles.User)]
    public async Task<IActionResult> TestCancel()
    {
        if (!TestBillingEnabled) return NotFound();
        var sub = (await current.GetAsync())!.Subscription;
        if (sub is { Provider: Providers.Admin })
        {
            db.Subscriptions.Remove(sub);
            await db.SaveChangesAsync();
        }
        return Ok(new { ok = true });
    }
}
