using System.ComponentModel.DataAnnotations;

namespace PlaygroundGuide.Api.Models;

public class PlaygroundFlag
{
    [Key]
    public Guid Id { get; set; }

    public Guid PlaygroundId { get; set; }

    public Playground Playground { get; set; } = null!;

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public FlagType FlagType { get; set; }

    public FlagReason Reason { get; set; }

    [MaxLength(200)]
    public string? ReasonNote { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
