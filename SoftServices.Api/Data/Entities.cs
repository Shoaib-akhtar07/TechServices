namespace SoftServices.Api.Data;

public static class Roles
{
    public const string User = "user";
    /// <summary>Can write and publish their own articles.</summary>
    public const string Author = "author";
    public const string Admin = "admin";
    public static readonly string[] All = [User, Author, Admin];
}

public static class Providers
{
    public const string Stripe = "stripe";
    public const string Paypal = "paypal";
    /// <summary>Approved bank / wallet transfer.</summary>
    public const string Manual = "manual";
    /// <summary>Granted from the admin panel.</summary>
    public const string Admin = "admin";
}

public static class Plans
{
    public const string Monthly = "monthly";
    public const string Yearly = "yearly";
    public static string Normalize(string? plan) => plan == Yearly ? Yearly : Monthly;
    public static int Days(string plan) => plan == Yearly ? 365 : 30;
}

public class User
{
    public string Id { get; set; } = Ids.New();
    public string Email { get; set; } = "";
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = "";
    public string? StripeCustomerId { get; set; }
    public string Role { get; set; } = Roles.User;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Subscription? Subscription { get; set; }
    public List<Usage> Usage { get; set; } = [];
    public List<ManualPayment> ManualPayments { get; set; } = [];
    public List<Post> Posts { get; set; } = [];
}

/// <summary>Pro jobs per user per UTC day, for the fair-use limit.</summary>
public class Usage
{
    public string Id { get; set; } = Ids.New();
    public string UserId { get; set; } = "";
    public User? User { get; set; }
    /// <summary>YYYY-MM-DD (UTC)</summary>
    public string Day { get; set; } = "";
    public int Count { get; set; }
}

public class Subscription
{
    public string Id { get; set; } = Ids.New();
    public string UserId { get; set; } = "";
    public User? User { get; set; }
    public string Provider { get; set; } = Providers.Stripe;
    public string? StripeSubscriptionId { get; set; }
    public string? PaypalSubscriptionId { get; set; }
    /// <summary>active | trialing | past_due | canceled | incomplete | unpaid ...</summary>
    public string Status { get; set; } = "";
    public string Plan { get; set; } = Plans.Monthly;
    public DateTime CurrentPeriodEnd { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive => (Status is "active" or "trialing") && CurrentPeriodEnd > DateTime.UtcNow;
}

/// <summary>Admin-panel settings (payment keys, prices, limits). Secret values are stored encrypted.</summary>
public class Setting
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Bank transfer / JazzCash / Easypaisa payments, approved by an admin.</summary>
public class ManualPayment
{
    public string Id { get; set; } = Ids.New();
    public string UserId { get; set; } = "";
    public User? User { get; set; }
    public string Plan { get; set; } = Plans.Monthly;
    /// <summary>Display amount at the time of payment, e.g. "PKR 1,700".</summary>
    public string Amount { get; set; } = "";
    public string Method { get; set; } = "";
    /// <summary>Transaction ID given by the customer.</summary>
    public string Reference { get; set; } = "";
    public string? Note { get; set; }
    /// <summary>pending | approved | rejected</summary>
    public string Status { get; set; } = "pending";
    public string? AdminNote { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Every successful charge / approval, for the payment history and admin revenue view.</summary>
public class PaymentRecord
{
    public string Id { get; set; } = Ids.New();
    public string UserId { get; set; } = "";
    public User? User { get; set; }
    public string Provider { get; set; } = "";
    /// <summary>Provider's id for this event (Stripe invoice, PayPal sale, manual payment id). Unique per provider.</summary>
    public string ExternalId { get; set; } = "";
    public string Plan { get; set; } = Plans.Monthly;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Blog article.</summary>
public class Post
{
    public string Id { get; set; } = Ids.New();
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    /// <summary>Short summary, shown in lists and in Google results.</summary>
    public string Description { get; set; } = "";
    /// <summary>Slug of the tool promoted at the end of the post (optional).</summary>
    public string? Tool { get; set; }
    /// <summary>JSON array of blocks: { h2 } | { p } | { ul: [] } | { ol: [] }.</summary>
    public string Body { get; set; } = "[]";
    public string? CoverImageUrl { get; set; }
    /// <summary>Comma-separated, lower-case.</summary>
    public string Tags { get; set; } = "";
    public string? AuthorId { get; set; }
    public User? Author { get; set; }
    public bool Published { get; set; } = true;
    /// <summary>A published post with a future date is scheduled and stays hidden until then.</summary>
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    public int Views { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public static class Ids
{
    public static string New() => Guid.NewGuid().ToString("N")[..25];
}
