using System.ComponentModel.DataAnnotations;

namespace PlaygroundGuide.Api.Models;

public class PlaygroundEnrichment
{
    [Key]
    public Guid Id { get; set; }

    public Guid PlaygroundId { get; set; }

    public Playground Playground { get; set; } = null!;

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public List<EquipmentType> Equipment { get; set; } = [];

    public List<AgeSuitability> AgeSuitability { get; set; } = [];

    public PlaygroundSize? Size { get; set; }

    public List<SurfaceType> SurfaceType { get; set; } = [];

    public string? OtherEquipment { get; set; }

    public string? TransportInfo { get; set; }

    public string? Notes { get; set; }

    public bool Reviewed { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
