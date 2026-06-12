using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PlaygroundGuide.Api.Data;
using PlaygroundGuide.Api.Models;

namespace PlaygroundGuide.Api.Services;

public class OsmImportService(HttpClient httpClient, ILogger<OsmImportService> logger)
{
    private const string OverpassQuery =
        "[out:json];node[\"leisure\"=\"playground\"](57.8,5.3,59.7,7.0);out body;";

    public async Task<(int created, int updated)> ImportRogalandAsync(AppDbContext db)
    {
        // Overpass requires the query unencoded in the body — percent-encoding causes 406.
        var content = new ByteArrayContent(Encoding.UTF8.GetBytes($"data={OverpassQuery}"));
        content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/x-www-form-urlencoded");

        var response = await httpClient.PostAsync("interpreter", content);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<OverpassResponse>(json)
            ?? throw new InvalidOperationException("Overpass returned an empty response.");

        var existingByOsmId = await db.Playgrounds
            .Where(p => p.OsmNodeId != null)
            .ToDictionaryAsync(p => p.OsmNodeId!.Value);

        int created = 0;
        int updated = 0;

        foreach (var node in result.Elements)
        {
            var tags = node.Tags != null
                ? JsonSerializer.Serialize(node.Tags)
                : "{}";

            var name = node.Tags != null && node.Tags.TryGetValue("name", out var n) ? n : null;
            var location = new Point(node.Lon, node.Lat) { SRID = 4326 };

            if (existingByOsmId.TryGetValue(node.Id, out var existing))
            {
                existing.Name = name;
                existing.Latitude = node.Lat;
                existing.Longitude = node.Lon;
                existing.Location = location;
                existing.OsmTags = tags;
                updated++;
            }
            else
            {
                db.Playgrounds.Add(new Playground
                {
                    Id = Guid.NewGuid(),
                    OsmNodeId = node.Id,
                    Name = name,
                    Latitude = node.Lat,
                    Longitude = node.Lon,
                    Location = location,
                    OsmTags = tags,
                    Source = PlaygroundSource.Osm,
                });
                created++;
            }
        }

        await db.SaveChangesAsync();

        logger.LogInformation("OSM import complete: {Created} created, {Updated} updated.", created, updated);

        return (created, updated);
    }

    private sealed class OverpassResponse
    {
        [JsonPropertyName("elements")]
        public List<OsmNode> Elements { get; set; } = [];
    }

    private sealed class OsmNode
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lon")]
        public double Lon { get; set; }

        [JsonPropertyName("tags")]
        public Dictionary<string, string>? Tags { get; set; }
    }
}
