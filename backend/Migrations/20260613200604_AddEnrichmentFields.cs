using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEnrichmentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string[]>(
                name: "AgeSuitability",
                table: "playground_enrichments",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<string>(
                name: "Size",
                table: "playground_enrichments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OtherEquipment",
                table: "playground_enrichments",
                type: "text",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgeSuitability",
                table: "playground_enrichments");

            migrationBuilder.DropColumn(
                name: "Size",
                table: "playground_enrichments");

            migrationBuilder.DropColumn(
                name: "OtherEquipment",
                table: "playground_enrichments");
        }
    }
}
