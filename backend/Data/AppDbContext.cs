using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PlaygroundGuide.Api.Models;

namespace PlaygroundGuide.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Playground> Playgrounds => Set<Playground>();
    public DbSet<PlaygroundEnrichment> PlaygroundEnrichments => Set<PlaygroundEnrichment>();
    public DbSet<User> Users => Set<User>();

    // Stable, hard-coded seed user. Shared with the Implementation agent and frontend.
    public static readonly Guid SeedUserId = new("a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Playground>(entity =>
        {
            entity.ToTable("playgrounds");
            entity.HasIndex(p => p.OsmNodeId).IsUnique();
            // GiST index required for PostGIS spatial queries
            entity.HasIndex(p => p.Location).HasMethod("gist");
        });

        modelBuilder.Entity<PlaygroundEnrichment>(entity =>
        {
            entity.ToTable("playground_enrichments");
            var equipmentConverter = new ValueConverter<List<EquipmentType>, string[]>(
                v => v.Select(e => e.ToString()).ToArray(),
                v => v.Where(s => Enum.IsDefined(typeof(EquipmentType), s))
                      .Select(s => Enum.Parse<EquipmentType>(s))
                      .ToList()
            );
            var equipmentComparer = new ValueComparer<List<EquipmentType>>(
                (a, b) => (a == null && b == null) || (a != null && b != null && a.SequenceEqual(b)),
                v => v.Aggregate(0, (h, e) => HashCode.Combine(h, e.GetHashCode())),
                v => v.ToList()
            );
            entity.Property(e => e.Equipment)
                  .HasColumnType("text[]")
                  .HasConversion(equipmentConverter, equipmentComparer);
            entity.Property(e => e.TransportInfo).HasColumnType("text");
            entity.Property(e => e.Reviewed).HasDefaultValue(false);
            // RESTRICT prevents accidental enrichment data loss if an OSM re-import deletes and re-inserts playground rows
            entity.HasOne(e => e.Playground)
                  .WithMany(p => p.Enrichments)
                  .HasForeignKey(e => e.PlaygroundId)
                  .OnDelete(DeleteBehavior.Restrict);
            // RESTRICT protects enrichment data: deleting a user must not cascade-delete their submissions
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Enrichments)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasData(new User { Id = SeedUserId, Name = "Kristine" });
        });
    }
}
