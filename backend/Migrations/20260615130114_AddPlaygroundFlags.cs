using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlaygroundFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "playgrounds",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "playground_flags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlaygroundId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FlagType = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_playground_flags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_playground_flags_playgrounds_PlaygroundId",
                        column: x => x.PlaygroundId,
                        principalTable: "playgrounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_playground_flags_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_playground_flags_PlaygroundId_UserId",
                table: "playground_flags",
                columns: new[] { "PlaygroundId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_playground_flags_UserId",
                table: "playground_flags",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "playground_flags");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "playgrounds");
        }
    }
}
