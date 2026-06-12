using Microsoft.EntityFrameworkCore;
using PlaygroundGuide.Api.Models;

namespace PlaygroundGuide.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Playground> Playgrounds => Set<Playground>();
    public DbSet<PlaygroundEnrichment> PlaygroundEnrichments => Set<PlaygroundEnrichment>();

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
            entity.Property(e => e.Equipment).HasColumnType("text[]");
            entity.Property(e => e.Reviewed).HasDefaultValue(false);
            // RESTRICT prevents accidental enrichment data loss if an OSM re-import deletes and re-inserts playground rows
            entity.HasOne(e => e.Playground)
                  .WithMany(p => p.Enrichments)
                  .HasForeignKey(e => e.PlaygroundId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
