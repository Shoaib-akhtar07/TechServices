namespace SoftServices.Api.Services;

/// <summary>"App" section of appsettings.json / environment variables (App__FrontendUrl, ...).</summary>
public class AppOptions
{
    public string SiteName { get; set; } = "SoftServices";
    /// <summary>Public URL of the website. Payment providers send customers back here.</summary>
    public string FrontendUrl { get; set; } = "http://localhost:3000";
    /// <summary>Origins allowed to call the API from a browser.</summary>
    public string[] CorsOrigins { get; set; } = ["http://localhost:3000"];
    /// <summary>Emails that are admins in Development only (sign-up does not verify emails).</summary>
    public string[] DevAdminEmails { get; set; } = [];
    /// <summary>Development only: allows POST /api/billing/test-activate (Pro without paying).</summary>
    public bool EnableTestBilling { get; set; }
}

/// <summary>"Auth" section.</summary>
public class AuthOptions
{
    /// <summary>At least 32 characters. Signs login tokens and encrypts saved payment secrets.</summary>
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "SoftServices.Api";
    public int TokenDays { get; set; } = 30;
}
