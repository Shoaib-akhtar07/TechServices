using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers;

public record RegisterRequest(string? Email, string? Password, string? Name);
public record LoginRequest(string? Email, string? Password);
public record UpdateProfileRequest(string? Name);
public record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

[ApiController]
[Route("api/auth")]
public partial class AuthController(AppDbContext db, TokenService tokens, CurrentUser current, SettingsService settings, SubscriptionService subs) : ControllerBase
{
    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")] private static partial Regex EmailFormat();

    private static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var email = NormalizeEmail(req.Email);
        var password = req.Password ?? "";
        var name = (req.Name ?? "").Trim();
        if (name.Length > 80) name = name[..80];

        if (email.Length > 254 || !EmailFormat().IsMatch(email)) return BadRequest(new { error = "Please enter a valid email address." });
        if (password.Length < 8) return BadRequest(new { error = "Password must be at least 8 characters." });
        if (password.Length > 72) return BadRequest(new { error = "Password must be at most 72 characters." });
        if (await db.Users.AnyAsync(x => x.Email == email))
            return Conflict(new { error = "An account with this email already exists. Please log in." });

        var user = new User { Email = email, Name = name.Length > 0 ? name : null, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, 12) };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var (token, expires) = tokens.Create(user);
        return Ok(new { token, expiresAt = expires, user = await MeAsync(user) });
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = NormalizeEmail(req.Email);
        var user = await db.Users.Include(x => x.Subscription).FirstOrDefaultAsync(x => x.Email == email);
        // Same message either way, so the endpoint does not reveal which emails have accounts.
        if (user is null || string.IsNullOrEmpty(req.Password) || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Wrong email or password." });
        var (token, expires) = tokens.Create(user);
        return Ok(new { token, expiresAt = expires, user = await MeAsync(user) });
    }

    /// <summary>The logged-in user with Pro status, subscription and today's usage.</summary>
    [HttpGet("me")]
    [Require(Roles.User)]
    public async Task<IActionResult> Me() => Ok(await MeAsync((await current.GetAsync())!));

    [HttpPut("me")]
    [Require(Roles.User)]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest req)
    {
        var user = (await current.GetAsync())!;
        var name = (req.Name ?? "").Trim();
        user.Name = name.Length == 0 ? null : name.Length > 80 ? name[..80] : name;
        await db.SaveChangesAsync();
        return Ok(await MeAsync(user));
    }

    [HttpPost("change-password")]
    [Require(Roles.User)]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var user = (await current.GetAsync())!;
        if (string.IsNullOrEmpty(req.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Your current password is not correct." });
        if ((req.NewPassword ?? "").Length is < 8 or > 72) return BadRequest(new { error = "The new password must be 8 to 72 characters." });
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, 12);
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private async Task<object> MeAsync(User user)
    {
        var (pro, paid) = await current.AccessAsync(user);
        var sub = user.Subscription;
        return new
        {
            user.Id,
            user.Email,
            user.Name,
            user.Role,
            admin = current.IsAdmin(user),
            author = current.IsAuthor(user),
            pro,
            paid,
            freeMode = await settings.IsFreeModeAsync(),
            hasStripeBilling = user.StripeCustomerId is not null,
            subscription = sub is null ? null : new { sub.Provider, sub.Status, sub.Plan, sub.CurrentPeriodEnd, sub.CancelAtPeriodEnd, active = sub.IsActive },
            usage = new { today = await subs.UsageTodayAsync(user.Id), limit = await settings.GetDailyLimitAsync() },
            user.CreatedAt,
        };
    }
}
