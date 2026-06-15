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
    public DbSet<UserFavourite> UserFavourites => Set<UserFavourite>();
    public DbSet<UserSaved> UserSaved => Set<UserSaved>();
    public DbSet<PlaygroundFlag> PlaygroundFlags => Set<PlaygroundFlag>();
    public DbSet<UserHiddenPlayground> UserHiddenPlaygrounds => Set<UserHiddenPlayground>();

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
            entity.Property(p => p.IsHidden).HasDefaultValue(false);
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

            var ageSuitabilityConverter = new ValueConverter<List<AgeSuitability>, string[]>(
                v => v.Select(e => e.ToString()).ToArray(),
                v => v.Where(s => Enum.IsDefined(typeof(AgeSuitability), s))
                      .Select(s => Enum.Parse<AgeSuitability>(s))
                      .ToList()
            );
            var ageSuitabilityComparer = new ValueComparer<List<AgeSuitability>>(
                (a, b) => (a == null && b == null) || (a != null && b != null && a.SequenceEqual(b)),
                v => v.Aggregate(0, (h, e) => HashCode.Combine(h, e.GetHashCode())),
                v => v.ToList()
            );
            entity.Property(e => e.AgeSuitability)
                  .HasColumnType("text[]")
                  .HasConversion(ageSuitabilityConverter, ageSuitabilityComparer);

            entity.Property(e => e.Size)
                  .HasColumnType("text")
                  .HasConversion(new ValueConverter<PlaygroundSize?, string?>(
                      v => v.HasValue ? v.Value.ToString() : null,
                      v => v != null && Enum.IsDefined(typeof(PlaygroundSize), v)
                          ? Enum.Parse<PlaygroundSize>(v)
                          : (PlaygroundSize?)null
                  ));

            entity.Property(e => e.OtherEquipment).HasMaxLength(200);

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
            entity.HasIndex(e => new { e.PlaygroundId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasData(new User { Id = SeedUserId, Name = "Kristine" });
        });

        modelBuilder.Entity<UserFavourite>(entity =>
        {
            entity.ToTable("user_favourites");
            entity.HasKey(f => new { f.UserId, f.PlaygroundId });
            // RESTRICT protects favourites: an OSM re-import or user deletion must not silently cascade-delete them
            entity.HasOne(f => f.Playground)
                  .WithMany(p => p.Favourites)
                  .HasForeignKey(f => f.PlaygroundId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(f => f.User)
                  .WithMany(u => u.Favourites)
                  .HasForeignKey(f => f.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserSaved>(entity =>
        {
            entity.ToTable("user_saved");
            entity.HasKey(s => new { s.UserId, s.PlaygroundId });
            // RESTRICT protects saved entries: an OSM re-import or user deletion must not silently cascade-delete them
            entity.HasOne(s => s.Playground)
                  .WithMany(p => p.Saved)
                  .HasForeignKey(s => s.PlaygroundId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(s => s.User)
                  .WithMany(u => u.Saved)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PlaygroundFlag>(entity =>
        {
            entity.ToTable("playground_flags");
            entity.Property(f => f.FlagType)
                  .HasColumnType("text")
                  .HasConversion(new ValueConverter<FlagType, string>(
                      v => v.ToString(),
                      v => Enum.IsDefined(typeof(FlagType), v) ? Enum.Parse<FlagType>(v) : default
                  ));
            entity.Property(f => f.Reason)
                  .HasColumnType("text")
                  .HasConversion(new ValueConverter<FlagReason, string>(
                      v => v.ToString(),
                      v => Enum.IsDefined(typeof(FlagReason), v) ? Enum.Parse<FlagReason>(v) : default
                  ))
                  // Non-nullable: backfill any pre-existing #23 flag rows with "Other" so the column adds without a NOT NULL violation
                  .HasDefaultValue(FlagReason.Other)
                  // Sentinel is an out-of-range value EF never persists, so an explicit PermanentlyClosed (CLR default 0) is still written rather than swapped for the DB default
                  .HasSentinel((FlagReason)(-1));
            entity.Property(f => f.ReasonNote).HasMaxLength(200);
            // RESTRICT protects flags: an OSM re-import or user deletion must not silently cascade-delete them
            entity.HasOne(f => f.Playground)
                  .WithMany(p => p.Flags)
                  .HasForeignKey(f => f.PlaygroundId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(f => f.User)
                  .WithMany(u => u.Flags)
                  .HasForeignKey(f => f.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(f => new { f.PlaygroundId, f.UserId }).IsUnique();
        });

        modelBuilder.Entity<UserHiddenPlayground>(entity =>
        {
            entity.ToTable("user_hidden_playgrounds");
            entity.HasKey(h => new { h.UserId, h.PlaygroundId });
            // RESTRICT keeps these consistent with favourites/saved: an OSM re-import or user deletion must not silently cascade-delete them
            entity.HasOne(h => h.Playground)
                  .WithMany(p => p.HiddenByUsers)
                  .HasForeignKey(h => h.PlaygroundId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(h => h.User)
                  .WithMany(u => u.Hidden)
                  .HasForeignKey(h => h.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
