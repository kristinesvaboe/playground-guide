using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSubmittedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SubmittedByUserId",
                table: "playgrounds",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_playgrounds_SubmittedByUserId",
                table: "playgrounds",
                column: "SubmittedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_playgrounds_users_SubmittedByUserId",
                table: "playgrounds",
                column: "SubmittedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_playgrounds_users_SubmittedByUserId",
                table: "playgrounds");

            migrationBuilder.DropIndex(
                name: "IX_playgrounds_SubmittedByUserId",
                table: "playgrounds");

            migrationBuilder.DropColumn(
                name: "SubmittedByUserId",
                table: "playgrounds");
        }
    }
}
