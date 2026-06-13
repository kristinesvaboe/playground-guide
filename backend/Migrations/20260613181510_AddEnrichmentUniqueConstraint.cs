using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEnrichmentUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_playground_enrichments_PlaygroundId",
                table: "playground_enrichments");

            migrationBuilder.CreateIndex(
                name: "IX_playground_enrichments_PlaygroundId_UserId",
                table: "playground_enrichments",
                columns: new[] { "PlaygroundId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_playground_enrichments_PlaygroundId_UserId",
                table: "playground_enrichments");

            migrationBuilder.CreateIndex(
                name: "IX_playground_enrichments_PlaygroundId",
                table: "playground_enrichments",
                column: "PlaygroundId");
        }
    }
}
