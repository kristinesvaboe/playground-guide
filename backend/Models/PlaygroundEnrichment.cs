using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PlaygroundGuide.Api.Models;

public class PlaygroundEnrichment
{
    [Key]
    public Guid Id { get; set; }

    public Guid PlaygroundId { get; set; }

    public Playground Playground { get; set; } = null!;

    [Column(TypeName = "text[]")]
    public List<string> Equipment { get; set; } = [];

    public string? Parking { get; set; }

    public string? Notes { get; set; }

    public bool Reviewed { get; set; }
}
