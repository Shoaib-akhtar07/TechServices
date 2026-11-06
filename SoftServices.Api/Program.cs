using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Options ----------
builder.Services.Configure<AppOptions>(config.GetSection("App"));
builder.Services.Configure<AuthOptions>(config.GetSection("Auth"));
var authOptions = config.GetSection("Auth").Get<AuthOptions>() ?? new AuthOptions();
if (authOptions.Secret.Length < 32)
    throw new InvalidOperationException("Set Auth:Secret (env Auth__Secret) to a random value of at least 32 characters.");
var appOptions = config.GetSection("App").Get<AppOptions>() ?? new AppOptions();

// ---------- Database ----------
// SQLite by default (single server / Docker volume). Set Database:Provider to "SqlServer" for SQL Server / Azure SQL.
var provider = config["Database:Provider"] ?? "Sqlite";
var connection = config.GetConnectionString("Default") ?? "Data Source=softservices.db";
builder.Services.AddDbContext<AppDbContext>(o =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)) o.UseSqlServer(connection);
    else o.UseSqlite(connection);
});

// ---------- Services ----------
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<SubscriptionService>();
builder.Services.AddScoped<StripeService>();
builder.Services.AddHttpClient<PaypalService>(c => c.Timeout = TimeSpan.FromSeconds(30));

builder.Services.AddControllers();
builder.Services.AddProblemDetails();

// ---------- Auth (JWT bearer) ----------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = authOptions.Issuer,
        ValidAudience = authOptions.Issuer,
        IssuerSigningKey = TokenService.SigningKey(authOptions.Secret),
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.FromMinutes(1),
    };
});
builder.Services.AddAuthorization();

// ---------- CORS (the website calls the API from the browser) ----------
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(appOptions.CorsOrigins.Select(x => x.TrimEnd('/')).ToArray())
    .AllowAnyHeader()
    .AllowAnyMethod()));

// ---------- Rate limits (login / sign-up brute force) ----------
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

// ---------- API docs at /docs ----------
builder.Services.AddOpenApi(o => o.AddDocumentTransformer((doc, _, _) =>
{
    doc.Info = new OpenApiInfo { Title = "SoftServices API", Version = "v1", Description = "Accounts, subscriptions & payments (Stripe, PayPal, manual) and articles." };
    doc.Components ??= new OpenApiComponents();
    doc.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
    {
        ["Bearer"] = new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", Description = "Token from POST /api/auth/login" },
    };
    doc.Security = [new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", doc)] = [] }];
    return Task.CompletedTask;
}));

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

// ---------- Database setup ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();

    // dotnet run -- make-admin you@example.com   (or: dotnet SoftServices.Api.dll make-admin you@example.com)
    if (args.Length >= 1 && args[0] == "make-admin")
    {
        var email = args.ElementAtOrDefault(1)?.Trim().ToLowerInvariant();
        var user = email is null ? null : await db.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is null)
        {
            Console.Error.WriteLine($"No account with email '{email}'. Sign up first, then run this again.");
            return 1;
        }
        user.Role = Roles.Admin;
        await db.SaveChangesAsync();
        Console.WriteLine($"{email} is now an admin.");
        return 0;
    }

    // dotnet run -- import-prisma ../SoftServices/prisma/dev.db   (copy data from the old Next.js database)
    if (args.Length >= 2 && args[0] == "import-prisma")
        return await PrismaImport.RunAsync(db, app.Services.GetRequiredService<SettingsService>(), args[1]);

    // echo "value" | dotnet run -- set-setting paypal_client_secret
    // Saves an admin setting from the server (secrets encrypted). The value is read from stdin so it stays out of shell history.
    if (args.Length >= 1 && args[0] == "set-setting")
    {
        var key = args.ElementAtOrDefault(1);
        if (key is null || !SettingsService.Definitions.TryGetValue(key, out var def))
        {
            Console.Error.WriteLine($"Unknown setting '{key}'. Known: {string.Join(", ", SettingsService.Definitions.Keys)}");
            return 1;
        }
        var value = (args.ElementAtOrDefault(2) ?? Console.In.ReadToEnd()).Trim();
        await app.Services.GetRequiredService<SettingsService>().SaveAsync(new Dictionary<string, string?> { [key] = value });
        Console.WriteLine(def.Secret ? $"{key} saved (encrypted)." : $"{key} = {value}");
        return 0;
    }
}

// ---------- Pipeline ----------
app.UseForwardedHeaders();

// Unexpected errors → { error } JSON without internals. Payment provider failures → 502.
app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, message) = ex switch
    {
        Stripe.StripeException se => (502, $"Payment provider error: {se.StripeError?.Message ?? se.Message}"),
        InvalidOperationException ioe => (400, ioe.Message),
        BadHttpRequestException bre => (bre.StatusCode, bre.Message),
        _ => (500, "Something went wrong. Please try again."),
    };
    if (status >= 500) ctx.RequestServices.GetRequiredService<ILogger<Program>>().LogError(ex, "Unhandled error");
    ctx.Response.StatusCode = status;
    await ctx.Response.WriteAsJsonAsync(new { error = message });
}));

if (!app.Environment.IsDevelopment()) app.UseHsts();

app.UseStaticFiles(); // wwwroot/uploads (article images)
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference("/docs", o => o.WithTitle("SoftServices API"));
app.MapGet("/", () => Results.Redirect("/docs")).ExcludeFromDescription();
app.MapGet("/health", () => Results.Ok(new { ok = true })).ExcludeFromDescription();
app.MapControllers();

app.Run();
return 0;
