using System.ComponentModel.DataAnnotations;

namespace PlaygroundGuide.Api.Models;

public class User
{
    [Key]
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public ICollection<PlaygroundEnrichment> Enrichments { get; set; } = [];

    public ICollection<UserFavourite> Favourites { get; set; } = [];

    public ICollection<UserSaved> Saved { get; set; } = [];
}
