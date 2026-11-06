using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoftServices.Api.Data;
using SoftServices.Api.Services;

namespace SoftServices.Api.Controllers;

/// <summary>
/// Article input. Send the text either as <see cref="Body"/> (simple text: "## Heading", "- bullet",
/// "1. step", blank line between paragraphs) or as <see cref="Blocks"/> (JSON block array).
/// </summary>
public record PostRequest(
    string? Title,
    string? Slug,
    string? Description,
    string? Body,
    JsonElement? Blocks,
    string? Tool,
    string? CoverImageUrl,
    string[]? Tags,
    bool Published = true,
    DateTime? PublishedAt = null);

[ApiController]
[Route("api/posts")]
public class PostsController(AppDbContext db, CurrentUser current, IWebHostEnvironment env) : ControllerBase
{
    private const long MaxImageBytes = 5 * 1024 * 1024;
    private static readonly Dictionary<string, string> ImageTypes = new()
    {
        ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp", ["image/gif"] = ".gif",
    };

    private static IQueryable<Post> Visible(IQueryable<Post> q)
    {
        var now = DateTime.UtcNow;
        return q.Where(x => x.Published && x.PublishedAt <= now);
    }

    private static object Summary(Post p) => new
    {
        p.Id,
        p.Slug,
        p.Title,
        p.Description,
        p.CoverImageUrl,
        tags = SplitTags(p.Tags),
        p.Tool,
        author = p.Author is null ? null : new { p.Author.Id, name = p.Author.Name ?? "SoftServices" },
        p.Published,
        p.PublishedAt,
        date = p.PublishedAt.ToString("yyyy-MM-dd"),
        p.UpdatedAt,
        p.Views,
        readingMinutes = Services.Blocks.ReadingMinutes(p.Body),
    };

    private static object Full(Post p) => new
    {
        p.Id,
        p.Slug,
        p.Title,
        p.Description,
        p.CoverImageUrl,
        tags = SplitTags(p.Tags),
        p.Tool,
        author = p.Author is null ? null : new { p.Author.Id, name = p.Author.Name ?? "SoftServices" },
        p.Published,
        p.PublishedAt,
        date = p.PublishedAt.ToString("yyyy-MM-dd"),
        p.CreatedAt,
        p.UpdatedAt,
        p.Views,
        readingMinutes = Services.Blocks.ReadingMinutes(p.Body),
        body = Services.Blocks.Parse(p.Body),
        bodyText = Services.Blocks.ToText(p.Body),
    };

    private static string[] SplitTags(string tags) => tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    // ---------- Public ----------

    /// <summary>Published articles, newest first. Filter by tag, search title/description with q.</summary>
    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int pageSize = 12, string? tag = null, string? q = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = Visible(db.Posts.AsNoTracking().Include(x => x.Author));
        if (!string.IsNullOrWhiteSpace(tag))
        {
            var t = tag.Trim().ToLowerInvariant();
            query = query.Where(x => ("," + x.Tags + ",").Contains("," + t + ","));
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(x => EF.Functions.Like(x.Title, $"%{term}%") || EF.Functions.Like(x.Description, $"%{term}%"));
        }
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.PublishedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { page, pageSize, total, items = items.Select(Summary) });
    }

    /// <summary>All tags used by published articles, with counts.</summary>
    [HttpGet("tags")]
    public async Task<IActionResult> Tags()
    {
        var all = await Visible(db.Posts.AsNoTracking()).Select(x => x.Tags).ToListAsync();
        return Ok(all.SelectMany(SplitTags).GroupBy(x => x).Select(g => new { tag = g.Key, count = g.Count() }).OrderByDescending(x => x.count));
    }

    /// <summary>One published article by slug (counts a view).</summary>
    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug)
    {
        var post = await Visible(db.Posts.Include(x => x.Author)).FirstOrDefaultAsync(x => x.Slug == slug);
        if (post is null) return NotFound(new { error = "Article not found." });
        await db.Posts.Where(x => x.Id == post.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Views, x => x.Views + 1));
        return Ok(Full(post));
    }

    // ---------- Authors & admins ----------

    /// <summary>Articles the caller can edit (authors: their own; admins: all), drafts and scheduled included.</summary>
    [HttpGet("manage")]
    [Require(Roles.Author)]
    public async Task<IActionResult> Manage(int page = 1, int pageSize = 20, string? status = null)
    {
        var me = (await current.GetAsync())!;
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Posts.AsNoTracking().Include(x => x.Author).AsQueryable();
        if (!current.IsAdmin(me)) query = query.Where(x => x.AuthorId == me.Id);
        var now = DateTime.UtcNow;
        query = status switch
        {
            "draft" => query.Where(x => !x.Published),
            "scheduled" => query.Where(x => x.Published && x.PublishedAt > now),
            "published" => query.Where(x => x.Published && x.PublishedAt <= now),
            _ => query,
        };
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { page, pageSize, total, items = items.Select(Summary) });
    }

    [HttpGet("manage/{id}")]
    [Require(Roles.Author)]
    public async Task<IActionResult> GetForEdit(string id)
    {
        var post = await FindEditableAsync(id);
        return post is null ? NotFound(new { error = "Article not found." }) : Ok(Full(post));
    }

    [HttpPost]
    [Require(Roles.Author)]
    public async Task<IActionResult> Create(PostRequest req)
    {
        var post = new Post { AuthorId = current.Id };
        var error = await ApplyAsync(post, req);
        if (error is not null) return error;
        db.Posts.Add(post);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetForEdit), new { id = post.Id }, Full(post));
    }

    [HttpPut("{id}")]
    [Require(Roles.Author)]
    public async Task<IActionResult> Update(string id, PostRequest req)
    {
        var post = await FindEditableAsync(id);
        if (post is null) return NotFound(new { error = "Article not found." });
        var error = await ApplyAsync(post, req);
        if (error is not null) return error;
        await db.SaveChangesAsync();
        return Ok(Full(post));
    }

    [HttpDelete("{id}")]
    [Require(Roles.Author)]
    public async Task<IActionResult> Delete(string id)
    {
        var post = await FindEditableAsync(id);
        if (post is null) return NotFound(new { error = "Article not found." });
        db.Posts.Remove(post);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Upload a cover / inline image (JPEG, PNG, WebP, GIF up to 5 MB). Returns its public URL.</summary>
    [HttpPost("uploads")]
    [Require(Roles.Author)]
    [RequestSizeLimit(MaxImageBytes + 64 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "Please choose an image." });
        if (file.Length > MaxImageBytes) return BadRequest(new { error = "Images can be at most 5 MB." });
        if (!ImageTypes.TryGetValue(file.ContentType, out var ext)) return BadRequest(new { error = "Use a JPEG, PNG, WebP or GIF image." });

        // Check the file really starts like an image of that type (the browser-sent type can be faked).
        var head = new byte[12];
        await using (var s = file.OpenReadStream()) _ = await s.ReadAsync(head);
        var looksRight = ext switch
        {
            ".jpg" => head[0] == 0xFF && head[1] == 0xD8,
            ".png" => head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47,
            ".gif" => head[0] == 'G' && head[1] == 'I' && head[2] == 'F',
            ".webp" => head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F' && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P',
            _ => false,
        };
        if (!looksRight) return BadRequest(new { error = "This file is not a valid image." });

        var dir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", DateTime.UtcNow.ToString("yyyy-MM"));
        Directory.CreateDirectory(dir);
        var name = $"{Guid.NewGuid():N}{ext}";
        await using (var target = System.IO.File.Create(Path.Combine(dir, name)))
            await file.CopyToAsync(target);
        var url = $"{Request.Scheme}://{Request.Host}/uploads/{DateTime.UtcNow:yyyy-MM}/{name}";
        return Ok(new { url });
    }

    private async Task<Post?> FindEditableAsync(string id)
    {
        var me = (await current.GetAsync())!;
        var post = await db.Posts.Include(x => x.Author).FirstOrDefaultAsync(x => x.Id == id);
        return post is not null && (current.IsAdmin(me) || post.AuthorId == me.Id) ? post : null;
    }

    private static string Cut(string? s, int max)
    {
        var t = (s ?? "").Trim();
        return t.Length > max ? t[..max] : t;
    }

    /// <summary>Validate the request and copy it onto the post. Returns an error response, or null when it is fine.</summary>
    private async Task<IActionResult?> ApplyAsync(Post post, PostRequest req)
    {
        var title = Cut(req.Title, 160);
        var slug = Services.Slug.Make(Cut(req.Slug, 100) is { Length: > 0 } s ? s : title);
        var description = Cut(req.Description, 300);

        var blocks = req.Blocks is { ValueKind: not JsonValueKind.Undefined and not JsonValueKind.Null } b
            ? Services.Blocks.Validate(b)
            : Services.Blocks.FromText(Cut(req.Body, 100_000));
        if (blocks is null) return BadRequest(new { error = "Blocks must be an array of { h2 } | { p } | { ul: [] } | { ol: [] }." });

        if (title.Length == 0 || slug.Length == 0) return BadRequest(new { error = "Please add a title." });
        if (description.Length == 0) return BadRequest(new { error = "Please add a short description — it is shown in Google results." });
        if (blocks.Count == 0) return BadRequest(new { error = "The article has no text yet." });
        if (await db.Posts.AnyAsync(x => x.Slug == slug && x.Id != post.Id))
            return Conflict(new { error = $"Another article already uses the address /blog/{slug}/." });

        var cover = Cut(req.CoverImageUrl, 500);
        if (cover.Length > 0 && !(Uri.TryCreate(cover, UriKind.Absolute, out var u) && u.Scheme is "http" or "https") && !cover.StartsWith('/'))
            return BadRequest(new { error = "The cover image must be a web address (https://…)." });

        var tags = (req.Tags ?? [])
            .Select(t => Services.Slug.Make(t))
            .Where(t => t.Length > 0)
            .Distinct()
            .Take(10);

        post.Title = title;
        post.Slug = slug;
        post.Description = description;
        post.Body = blocks.ToJsonString();
        post.Tool = Cut(req.Tool, 80) is { Length: > 0 } tool ? tool : null;
        post.CoverImageUrl = cover.Length > 0 ? cover : null;
        post.Tags = string.Join(',', tags);
        post.Published = req.Published;
        if (req.PublishedAt is { } at) post.PublishedAt = at.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(at, DateTimeKind.Utc) : at.ToUniversalTime();
        return null;
    }
}
