using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserFavourites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_favourites",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlaygroundId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_favourites", x => new { x.UserId, x.PlaygroundId });
                    table.ForeignKey(
                        name: "FK_user_favourites_playgrounds_PlaygroundId",
                        column: x => x.PlaygroundId,
                        principalTable: "playgrounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_favourites_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_favourites_PlaygroundId",
                table: "user_favourites",
                column: "PlaygroundId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_favourites");
        }
    }
}
