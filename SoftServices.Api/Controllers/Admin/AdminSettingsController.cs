using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/settings")]
[Require(Roles.Admin)]
public class AdminSettingsController(SettingsService settings, StripeService stripe, PaypalService paypal, IOptions<AppOptions> app) : ControllerBase
{
    /// <summary>All settings. Secrets come back as { saved: true|false }, never as their value.</summary>
    [HttpGet]
    public async Task<IActionResult> Get() => Ok(new { values = await settings.GetForAdminAsync(), methods = await settings.GetPaymentMethodsAsync() });

    /// <summary>Save any subset of settings, e.g. { "price_monthly": "6.99", "manual_enabled": "1" }. Empty secrets are ignored.</summary>
    [HttpPut]
    public async Task<IActionResult> Save(Dictionary<string, string?> values)
    {
        var unknown = values.Keys.Where(k => !SettingsService.Definitions.ContainsKey(k)).ToList();
        if (unknown.Count > 0) return BadRequest(new { error = $"Unknown setting(s): {string.Join(", ", unknown)}" });
        await settings.SaveAsync(values);
        return await Get();
    }

    /// <summary>Remove a saved value (e.g. a secret key).</summary>
    [HttpDelete("{key}")]
    public async Task<IActionResult> Clear(string key)
    {
        if (!SettingsService.Definitions.ContainsKey(key)) return NotFound(new { error = "Unknown setting." });
        await settings.ClearAsync(key);
        return Ok(new { message = "Cleared." });
    }

    [HttpPost("stripe/test")]
    public async Task<IActionResult> TestStripe()
    {
        try
        {
            await stripe.TestAsync();
            return Ok(new { message = "Stripe key works." });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = $"Stripe: {e.Message}" });
        }
    }

    /// <summary>Create a product with monthly + yearly prices from the saved amounts and save their IDs.</summary>
    [HttpPost("stripe/create-prices")]
    public async Task<IActionResult> CreateStripePrices()
    {
        var p = await settings.GetPlansAsync();
        try
        {
            var (m, y) = await stripe.CreatePricesAsync(p.Monthly.Price, p.Yearly.Price, p.Currency, $"{app.Value.SiteName} Pro");
            await settings.SaveAsync(new Dictionary<string, string?> { ["stripe_price_monthly"] = m, ["stripe_price_yearly"] = y });
            return Ok(new { message = "Stripe prices created.", monthly = m, yearly = y });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = $"Stripe: {e.Message}" });
        }
    }

    [HttpPost("paypal/test")]
    public async Task<IActionResult> TestPaypal()
    {
        try
        {
            await paypal.TestAsync();
            return Ok(new { message = "PayPal credentials work." });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    /// <summary>Create a PayPal product with monthly + yearly plans from the saved amounts and save their IDs.</summary>
    [HttpPost("paypal/create-plans")]
    public async Task<IActionResult> CreatePaypalPlans()
    {
        var p = await settings.GetPlansAsync();
        try
        {
            var (product, m, y) = await paypal.CreatePlansAsync(p.Monthly.Price, p.Yearly.Price, p.Currency, $"{app.Value.SiteName} Pro");
            await settings.SaveAsync(new Dictionary<string, string?> { ["paypal_product_id"] = product, ["paypal_plan_monthly"] = m, ["paypal_plan_yearly"] = y });
            return Ok(new { message = "PayPal plans created.", product, monthly = m, yearly = y });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}
