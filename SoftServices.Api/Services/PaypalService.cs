using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SoftServices.Api.Data;

namespace SoftServices.Api.Services;

/// <summary>PayPal Subscriptions REST API. Credentials, mode and plan IDs come from the admin settings.</summary>
public class PaypalService(HttpClient http, AppDbContext db, SettingsService settings, SubscriptionService subs, IOptions<AppOptions> app)
{
    private static readonly Dictionary<string, string> Base = new()
    {
        ["sandbox"] = "https://api-m.sandbox.paypal.com",
        ["live"] = "https://api-m.paypal.com",
    };
    // Renewals are charged at next_billing_time; keep Pro on for a little while the payment goes through.
    private static readonly TimeSpan Grace = TimeSpan.FromDays(2);
    private static readonly SemaphoreSlim TokenLock = new(1, 1);
    private static (string Id, string Value, DateTime Expires)? _token;

    private async Task<(IReadOnlyDictionary<string, string> S, string BaseUrl)> ConfigAsync()
    {
        var s = await settings.GetAllAsync();
        if (s["paypal_client_id"].Length == 0 || s["paypal_client_secret"].Length == 0)
            throw new InvalidOperationException("PayPal is not configured.");
        return (s, Base.GetValueOrDefault(s["paypal_mode"], Base["sandbox"]));
    }

    private async Task<string> AccessTokenAsync(IReadOnlyDictionary<string, string> s, string baseUrl)
    {
        var id = $"{baseUrl}|{s["paypal_client_id"]}|{s["paypal_client_secret"]}";
        if (_token is { } t && t.Id == id && t.Expires > DateTime.UtcNow.AddMinutes(1)) return t.Value;
        await TokenLock.WaitAsync();
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/oauth2/token")
            {
                Content = new StringContent("grant_type=client_credentials", Encoding.UTF8, "application/x-www-form-urlencoded"),
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{s["paypal_client_id"]}:{s["paypal_client_secret"]}")));
            using var res = await http.SendAsync(req);
            var j = JsonNode.Parse(await res.Content.ReadAsStringAsync());
            if (!res.IsSuccessStatusCode)
                throw new InvalidOperationException($"PayPal login failed: {j?["error_description"] ?? (int)res.StatusCode}. Check the client ID, secret and mode.");
            var value = j!["access_token"]!.GetValue<string>();
            _token = (id, value, DateTime.UtcNow.AddSeconds(j["expires_in"]!.GetValue<int>()));
            return value;
        }
        finally { TokenLock.Release(); }
    }

    /// <summary>Call the PayPal API. <paramref name="body"/> may be an object or a ready JSON string.</summary>
    private async Task<JsonNode> ApiAsync(string path, HttpMethod? method = null, object? body = null)
    {
        var (s, baseUrl) = await ConfigAsync();
        using var req = new HttpRequestMessage(method ?? HttpMethod.Get, $"{baseUrl}{path}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await AccessTokenAsync(s, baseUrl));
        req.Headers.Add("Prefer", "return=representation");
        if (body is not null)
            req.Content = new StringContent(body as string ?? JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        using var res = await http.SendAsync(req);
        if (res.StatusCode == System.Net.HttpStatusCode.NoContent) return new JsonObject();
        var text = await res.Content.ReadAsStringAsync();
        var j = text.Length > 0 ? JsonNode.Parse(text) ?? new JsonObject() : new JsonObject();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"PayPal {path}: {j["details"]?[0]?["description"] ?? j["message"] ?? (int)res.StatusCode}");
        return j;
    }

    public async Task TestAsync()
    {
        var (s, baseUrl) = await ConfigAsync();
        _token = null;
        await AccessTokenAsync(s, baseUrl);
    }

    /// <summary>Start a subscription and return PayPal's approval page URL and the new subscription id.</summary>
    public async Task<(string Url, string Id)> CreateSubscriptionAsync(User user, string plan)
    {
        var s = await settings.GetAllAsync();
        var front = app.Value.FrontendUrl.TrimEnd('/');
        var sub = await ApiAsync("/v1/billing/subscriptions", HttpMethod.Post, new
        {
            plan_id = plan == Plans.Yearly ? s["paypal_plan_yearly"] : s["paypal_plan_monthly"],
            custom_id = user.Id,
            subscriber = new { email_address = user.Email },
            application_context = new
            {
                brand_name = app.Value.SiteName,
                user_action = "SUBSCRIBE_NOW",
                shipping_preference = "NO_SHIPPING",
                // PayPal adds ?subscription_id=...&ba_token=...&token=... to the return URL.
                return_url = $"{front}/account/?paypal=success",
                cancel_url = $"{front}/pricing/",
            },
        });
        var approve = sub["links"]?.AsArray().FirstOrDefault(l => l?["rel"]?.GetValue<string>() == "approve")?["href"]?.GetValue<string>();
        if (approve is null) throw new InvalidOperationException("PayPal did not return an approval link.");
        return (approve, sub["id"]!.GetValue<string>());
    }

    private static readonly Dictionary<string, string> Status = new()
    {
        ["ACTIVE"] = "active",
        ["SUSPENDED"] = "past_due",
        ["EXPIRED"] = "canceled",
        ["APPROVAL_PENDING"] = "incomplete",
        ["APPROVED"] = "incomplete",
    };

    private static DateTime? Date(JsonNode? n) =>
        n is null ? null : DateTime.Parse(n.GetValue<string>(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);

    /// <summary>Mirror a PayPal subscription into our database (always fetched fresh from PayPal, never trusted from the client).</summary>
    public async Task<(string UserId, string Status)> SyncSubscriptionAsync(string id)
    {
        var sub = await ApiAsync($"/v1/billing/subscriptions/{Uri.EscapeDataString(id)}");
        var userId = sub["custom_id"]?.GetValue<string>();
        var user = userId is null ? null : await db.Users.Include(x => x.Subscription).FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) throw new InvalidOperationException($"No user for PayPal subscription {id}");

        var s = await settings.GetAllAsync();
        var plan = sub["plan_id"]?.GetValue<string>() == s["paypal_plan_yearly"] ? Plans.Yearly : Plans.Monthly;
        var next = Date(sub["billing_info"]?["next_billing_time"]);
        var last = Date(sub["billing_info"]?["last_payment"]?["time"]);
        // Paid-up-to date: the next charge, else one period after the last payment.
        var periodEnd = next is { } n ? n + Grace : last is { } l ? l.AddDays(Plans.Days(plan)) : DateTime.UtcNow;

        var ppStatus = sub["status"]?.GetValue<string>() ?? "";
        var status = Status.GetValueOrDefault(ppStatus, "canceled");
        var cancelAtPeriodEnd = false;
        if (ppStatus == "CANCELLED")
        {
            // PayPal cancels right away; like Stripe, keep Pro until the end of the period already paid for.
            if (user.Subscription?.PaypalSubscriptionId == id && user.Subscription.CurrentPeriodEnd > periodEnd)
                periodEnd = user.Subscription.CurrentPeriodEnd;
            status = periodEnd > DateTime.UtcNow ? "active" : "canceled";
            cancelAtPeriodEnd = true;
        }
        await subs.SaveAsync(user.Id, new SubscriptionData(Providers.Paypal, status, plan, periodEnd, cancelAtPeriodEnd, PaypalSubscriptionId: id));
        return (user.Id, status);
    }

    public async Task CancelAsync(string id, string reason = "Cancelled by customer")
    {
        await ApiAsync($"/v1/billing/subscriptions/{Uri.EscapeDataString(id)}/cancel", HttpMethod.Post, new { reason });
        await SyncSubscriptionAsync(id);
    }

    /// <summary>Check a webhook really came from PayPal. The raw body is embedded as-is so the signature matches.</summary>
    public async Task<bool> VerifyWebhookAsync(IHeaderDictionary headers, string rawBody)
    {
        var webhookId = await settings.GetAsync("paypal_webhook_id");
        if (webhookId.Length == 0) throw new InvalidOperationException("PayPal webhook ID is not set.");
        var meta = JsonSerializer.Serialize(new
        {
            auth_algo = headers["paypal-auth-algo"].ToString(),
            cert_url = headers["paypal-cert-url"].ToString(),
            transmission_id = headers["paypal-transmission-id"].ToString(),
            transmission_sig = headers["paypal-transmission-sig"].ToString(),
            transmission_time = headers["paypal-transmission-time"].ToString(),
            webhook_id = webhookId,
        });
        var body = $"{meta[..^1]},\"webhook_event\":{rawBody}}}";
        var j = await ApiAsync("/v1/notifications/verify-webhook-signature", HttpMethod.Post, body);
        return j["verification_status"]?.GetValue<string>() == "SUCCESS";
    }

    /// <summary>Handle a verified webhook: re-read the subscription from PayPal and record renewal payments.</summary>
    public async Task HandleWebhookAsync(string rawBody)
    {
        var ev = JsonNode.Parse(rawBody)!;
        var type = ev["event_type"]?.GetValue<string>() ?? "";
        var r = ev["resource"];
        // Subscription events carry the subscription itself; payment events point to it.
        var id = type.StartsWith("BILLING.SUBSCRIPTION.") ? r?["id"]?.GetValue<string>() : r?["billing_agreement_id"]?.GetValue<string>();
        if (id is null) return;
        var (userId, _) = await SyncSubscriptionAsync(id);

        if (type == "PAYMENT.SALE.COMPLETED" && r?["id"]?.GetValue<string>() is { } saleId)
        {
            var amount = decimal.TryParse(r["amount"]?["total"]?.GetValue<string>(), NumberStyles.Number, CultureInfo.InvariantCulture, out var a) ? a : 0;
            var currency = r["amount"]?["currency"]?.GetValue<string>() ?? "USD";
            var plan = await db.Subscriptions.Where(x => x.UserId == userId).Select(x => x.Plan).FirstOrDefaultAsync() ?? Plans.Monthly;
            await subs.RecordPaymentAsync(userId, Providers.Paypal, saleId, plan, amount, currency);
        }
    }

    /// <summary>Admin: create a product and monthly + yearly plans from the configured prices.</summary>
    public async Task<(string Product, string Monthly, string Yearly)> CreatePlansAsync(decimal monthly, decimal yearly, string currency, string name)
    {
        var product = await ApiAsync("/v1/catalogs/products", HttpMethod.Post, new { name, type = "SERVICE", category = "SOFTWARE" });
        var productId = product["id"]!.GetValue<string>();
        async Task<string> Make(decimal amount, string unit, string label)
        {
            var plan = await ApiAsync("/v1/billing/plans", HttpMethod.Post, new
            {
                product_id = productId,
                name = $"{name} {label}",
                status = "ACTIVE",
                billing_cycles = new[]
                {
                    new
                    {
                        frequency = new { interval_unit = unit, interval_count = 1 },
                        tenure_type = "REGULAR",
                        sequence = 1,
                        total_cycles = 0,
                        pricing_scheme = new { fixed_price = new { value = amount.ToString("0.00", CultureInfo.InvariantCulture), currency_code = currency } },
                    },
                },
                payment_preferences = new { auto_bill_outstanding = true, payment_failure_threshold = 1 },
            });
            return plan["id"]!.GetValue<string>();
        }
        return (productId, await Make(monthly, "MONTH", "Monthly"), await Make(yearly, "YEAR", "Yearly"));
    }
}
