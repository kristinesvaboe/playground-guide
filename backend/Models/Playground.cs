using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NetTopologySuite.Geometries;

namespace PlaygroundGuide.Api.Models;

public class Playground
{
    [Key]
    public Guid Id { get; set; }

    public long? OsmNodeId { get; set; }

    public string? Name { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public Point Location { get; set; } = null!;

    [Column(TypeName = "jsonb")]
    public string OsmTags { get; set; } = "{}";

    public PlaygroundSource Source { get; set; }

    public ICollection<PlaygroundEnrichment> Enrichments { get; set; } = [];
}
