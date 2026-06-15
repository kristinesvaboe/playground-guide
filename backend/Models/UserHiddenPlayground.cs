namespace PlaygroundGuide.Api.Models;

public class UserHiddenPlayground
{
    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public Guid PlaygroundId { get; set; }

    public Playground Playground { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; }
}
