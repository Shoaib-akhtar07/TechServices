using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace SoftServices.Api.Services;

/// <summary>
/// Article text is stored as blocks: { h2 } | { p } | { ul: [] } | { ol: [] } (same format as the Next.js site).
/// Authors write simple text: "## Heading", "- bullet", "1. step", a blank line between paragraphs,
/// and [link text](/path/) for links.
/// </summary>
public static partial class Blocks
{
    [GeneratedRegex(@"^([-*•]|\d+[.)])\s")] private static partial Regex ListLine();
    [GeneratedRegex(@"^#{1,3}\s+(.+)")] private static partial Regex Heading();
    [GeneratedRegex(@"^[-*•]\s+(.+)")] private static partial Regex Bullet();
    [GeneratedRegex(@"^\d+[.)]\s+(.+)")] private static partial Regex Numbered();

    public static JsonArray FromText(string? text)
    {
        var blocks = new JsonArray();
        var para = new List<string>();
        JsonObject? list = null; // the list block that following "- " / "1. " lines join, until a blank line
        void EndPara()
        {
            if (para.Count > 0) blocks.Add(new JsonObject { ["p"] = string.Join(' ', para) });
            para.Clear();
        }
        void PushItem(string kind, string item)
        {
            if (list is null || !list.ContainsKey(kind))
            {
                list = new JsonObject { [kind] = new JsonArray() };
                blocks.Add(list);
            }
            list[kind]!.AsArray().Add(item);
        }

        foreach (var raw in (text ?? "").Replace("\r", "").Split('\n'))
        {
            var line = raw.Trim();
            Match m;
            if (line.Length == 0 || !ListLine().IsMatch(line)) list = null;
            if (line.Length == 0) EndPara();
            else if ((m = Heading().Match(line)).Success) { EndPara(); blocks.Add(new JsonObject { ["h2"] = m.Groups[1].Value }); }
            else if ((m = Bullet().Match(line)).Success) { EndPara(); PushItem("ul", m.Groups[1].Value); }
            else if ((m = Numbered().Match(line)).Success) { EndPara(); PushItem("ol", m.Groups[1].Value); }
            else para.Add(line);
        }
        EndPara();
        return blocks;
    }

    public static string ToText(string bodyJson)
    {
        var blocks = Parse(bodyJson);
        return string.Join("\n\n", blocks.Select(b => b switch
        {
            JsonObject o when o["h2"] is { } h => $"## {h}",
            JsonObject o when o["ul"] is JsonArray ul => string.Join('\n', ul.Select(x => $"- {x}")),
            JsonObject o when o["ol"] is JsonArray ol => string.Join('\n', ol.Select((x, i) => $"{i + 1}. {x}")),
            JsonObject o => o["p"]?.ToString() ?? "",
            _ => "",
        }));
    }

    public static JsonArray Parse(string bodyJson)
    {
        try { return JsonNode.Parse(bodyJson) as JsonArray ?? []; }
        catch (JsonException) { return []; }
    }

    /// <summary>Accepts blocks sent as JSON (must be an array of known block shapes).</summary>
    public static JsonArray? Validate(JsonElement blocks)
    {
        if (blocks.ValueKind != JsonValueKind.Array) return null;
        var result = new JsonArray();
        foreach (var b in blocks.EnumerateArray())
        {
            if (b.ValueKind != JsonValueKind.Object) return null;
            if (b.TryGetProperty("h2", out var h) && h.ValueKind == JsonValueKind.String) result.Add(new JsonObject { ["h2"] = h.GetString() });
            else if (b.TryGetProperty("p", out var p) && p.ValueKind == JsonValueKind.String) result.Add(new JsonObject { ["p"] = p.GetString() });
            else if (TryList(b, "ul", out var ul)) result.Add(new JsonObject { ["ul"] = ul });
            else if (TryList(b, "ol", out var ol)) result.Add(new JsonObject { ["ol"] = ol });
            else return null;
        }
        return result;
    }

    private static bool TryList(JsonElement b, string kind, out JsonArray items)
    {
        items = [];
        if (!b.TryGetProperty(kind, out var arr) || arr.ValueKind != JsonValueKind.Array) return false;
        foreach (var x in arr.EnumerateArray())
        {
            if (x.ValueKind != JsonValueKind.String) return false;
            items.Add(x.GetString());
        }
        return true;
    }

    /// <summary>Plain text of the article, for reading time and search.</summary>
    public static string PlainText(string bodyJson) => ToText(bodyJson);

    public static int ReadingMinutes(string bodyJson)
    {
        var words = PlainText(bodyJson).Split((char[])[' ', '\n', '\t'], StringSplitOptions.RemoveEmptyEntries).Length;
        return Math.Max(1, (int)Math.Ceiling(words / 200.0));
    }
}

public static partial class Slug
{
    [GeneratedRegex(@"[^\w\s-]")] private static partial Regex Junk();
    [GeneratedRegex(@"[\s_-]+")] private static partial Regex Separators();

    public static string Make(string s)
    {
        var normalized = new string(s.ToLowerInvariant().Normalize(NormalizationForm.FormKD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        var slug = Separators().Replace(Junk().Replace(normalized, "").Trim(), "-").Trim('-');
        return slug.Length > 80 ? slug[..80].Trim('-') : slug;
    }
}
