using Microsoft.AspNetCore.Mvc;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers;

/// <summary>
/// Payment providers are the source of truth: every subscription change and renewal is mirrored here.
/// A 5xx response makes the provider retry later.
/// </summary>
[ApiController]
[Route("api/webhooks")]
[ApiExplorerSettings(IgnoreApi = true)]
public class WebhooksController(StripeService stripe, PaypalService paypal, SettingsService settings, ILogger<WebhooksController> log) : ControllerBase
{
    private async Task<string> RawBodyAsync()
    {
        using var reader = new StreamReader(Request.Body);
        return await reader.ReadToEndAsync();
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> Stripe()
    {
        if (await stripe.ClientAsync() is null || (await settings.GetAsync("stripe_webhook_secret")).Length == 0)
            return StatusCode(503, "Stripe not configured");
        var json = await RawBodyAsync();
        try
        {
            await stripe.HandleWebhookAsync(json, Request.Headers["Stripe-Signature"]);
        }
        catch (global::Stripe.StripeException e) when (e.StripeError is null)
        {
            // ConstructEvent throws a StripeException without an API error when the signature is wrong.
            return BadRequest($"Invalid signature: {e.Message}");
        }
        catch (Exception e)
        {
            log.LogError(e, "Stripe webhook error");
            return StatusCode(500, "Webhook handler failed");
        }
        return Ok(new { received = true });
    }

    [HttpPost("paypal")]
    public async Task<IActionResult> Paypal()
    {
        var raw = await RawBodyAsync();
        try
        {
            if (!await paypal.VerifyWebhookAsync(Request.Headers, raw)) return BadRequest("Invalid signature");
        }
        catch (Exception e)
        {
            log.LogError(e, "PayPal webhook verification failed");
            return StatusCode(503, "PayPal not configured");
        }
        try
        {
            await paypal.HandleWebhookAsync(raw);
        }
        catch (Exception e)
        {
            log.LogError(e, "PayPal webhook error");
            return StatusCode(500, "Webhook handler failed");
        }
        return Ok(new { received = true });
    }
}
