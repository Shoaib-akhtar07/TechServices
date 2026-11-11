using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SoftServices.Api.Data;

namespace SoftServices.Api.Services;

public class TokenService(IOptions<AuthOptions> options)
{
    public static SymmetricSecurityKey SigningKey(string secret) => new(Encoding.UTF8.GetBytes(secret));

    /// <summary>The token only carries the user id: role and Pro status are read from the database on every request.</summary>
    public (string Token, DateTime ExpiresAt) Create(User user)
    {
        var o = options.Value;
        var expires = DateTime.UtcNow.AddDays(o.TokenDays);
        var jwt = new JwtSecurityToken(
            issuer: o.Issuer,
            audience: o.Issuer,
            claims: [new Claim(JwtRegisteredClaimNames.Sub, user.Id), new Claim(JwtRegisteredClaimNames.Email, user.Email)],
            expires: expires,
            signingCredentials: new SigningCredentials(SigningKey(o.Secret), SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }
}

/// <summary>The logged-in user for this request, loaded once from the database.</summary>
public class CurrentUser(IHttpContextAccessor http, AppDbContext db, SettingsService settings, IOptions<AppOptions> app, IHostEnvironment env)
{
    private bool _loaded;
    private User? _user;

    public string? Id => http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? http.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);

    public async Task<User?> GetAsync()
    {
        if (_loaded) return _user;
        _loaded = true;
        // A suspended account counts as logged out everywhere, so its existing tokens stop working at once.
        if (Id is { } id) _user = await db.Users.Include(x => x.Subscription).FirstOrDefaultAsync(x => x.Id == id && x.SuspendedAt == null);
        return _user;
    }

    public bool IsAdmin(User? user) =>
        user is not null && (user.Role == Roles.Admin
            || (env.IsDevelopment() && app.Value.DevAdminEmails.Any(e => string.Equals(e.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))));

    public bool IsAuthor(User? user) => user is not null && (user.Role == Roles.Author || IsAdmin(user));

    /// <summary>pro = may use Pro features (paid or free mode); paid = has an active subscription.</summary>
    public async Task<(bool Pro, bool Paid)> AccessAsync(User user)
    {
        var paid = user.Subscription?.IsActive == true;
        return (paid || await settings.IsFreeModeAsync(), paid);
    }
}

/// <summary>
/// Requires a logged-in user with one of the given access levels: "admin", "author" (authors and admins) or "pro".
/// Checked against the database, so role changes apply immediately. Non-admins get 404 on admin routes.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireAttribute(string level) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var current = context.HttpContext.RequestServices.GetRequiredService<CurrentUser>();
        var user = await current.GetAsync();
        if (user is null)
        {
            context.Result = new ObjectResult(new { error = "Please log in first." }) { StatusCode = 401 };
            return;
        }
        switch (level)
        {
            case Roles.Admin when !current.IsAdmin(user):
                context.Result = new NotFoundResult();
                break;
            case Roles.Author when !current.IsAuthor(user):
                context.Result = new ObjectResult(new { error = "Only authors and admins can do this." }) { StatusCode = 403 };
                break;
            case "pro" when !(await current.AccessAsync(user)).Pro:
                context.Result = new ObjectResult(new { error = "This needs a Pro subscription.", code = "pro_required" }) { StatusCode = 402 };
                break;
        }
    }
}
