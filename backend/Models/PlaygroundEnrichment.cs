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

    public string? TransportInfo { get; set; }

    public string? Notes { get; set; }

    public bool Reviewed { get; set; }
}
