using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers;

public record ConsumeRequest(int Count = 1);

/// <summary>Public site configuration the website needs on every page (cached briefly by the website).</summary>
[ApiController]
[Route("api")]
public class SiteController(SettingsService settings, SubscriptionService subs, CurrentUser current, IOptions<AppOptions> app, IHostEnvironment env) : ControllerBase
{
    [HttpGet("site")]
    public async Task<IActionResult> Site()
    {
        var s = await settings.GetAllAsync();
        JsonElement tools;
        try { tools = JsonDocument.Parse(s["tools"] is { Length: > 0 } t ? t : "{}").RootElement; }
        catch (JsonException) { tools = JsonDocument.Parse("{}").RootElement; }
        var methods = await settings.GetPaymentMethodsAsync();

        return Ok(new
        {
            freeMode = s["free_mode"] == "1",
            site = new
            {
                email = s["site_email"],
                twitter = s["site_twitter"],
                developer = s["site_developer"],
                developerUrl = s["site_developer_url"],
                announcement = s["site_announcement"].Trim(),
                verifyGoogle = s["verify_google"].Trim(),
                verifyBing = s["verify_bing"].Trim(),
            },
            tools,
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
            dailyLimit = await settings.GetDailyLimitAsync(),
            testBilling = env.IsDevelopment() && app.Value.EnableTestBilling,
        });
    }

    /// <summary>Count Pro jobs against today's fair-use limit. 429 (and nothing counted) when it would pass the limit.</summary>
    [HttpPost("pro/consume")]
    [Require("pro")]
    public async Task<IActionResult> Consume(ConsumeRequest req)
    {
        var count = Math.Clamp(req.Count, 1, 100);
        var limit = await settings.GetDailyLimitAsync();
        if (!await subs.ConsumeAsync(current.Id!, count))
            return StatusCode(429, new { error = $"You’ve reached today’s fair-use limit of {limit} Pro files. It resets at midnight UTC.", limit });
        return Ok(new { used = await subs.UsageTodayAsync(current.Id!), limit });
    }
}
