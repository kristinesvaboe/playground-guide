using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaygroundApproved : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Approved",
                table: "playgrounds",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Backfill existing user-submitted rows (PlaygroundSource.UserSubmitted == 1) to
            // unapproved; OSM rows keep the default true.
            migrationBuilder.Sql("UPDATE playgrounds SET \"Approved\" = false WHERE \"Source\" = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Approved",
                table: "playgrounds");
        }
    }
}
