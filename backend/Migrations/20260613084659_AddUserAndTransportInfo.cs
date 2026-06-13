using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAndTransportInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename (not drop/add) preserves any existing data in the former Parking column.
            migrationBuilder.RenameColumn(
                name: "Parking",
                table: "playground_enrichments",
                newName: "TransportInfo");

            // Backfill nulls before tightening to NOT NULL (greenfield: no rows expected, but safe regardless).
            migrationBuilder.Sql(
                "UPDATE playground_enrichments SET \"TransportInfo\" = '' WHERE \"TransportInfo\" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "TransportInfo",
                table: "playground_enrichments",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<Point>(
                name: "TransportLocation",
                table: "playground_enrichments",
                type: "geometry",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "playground_enrichments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "users",
                columns: new[] { "Id", "Name" },
                values: new object[] { new Guid("a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d"), "Kristine" });

            migrationBuilder.CreateIndex(
                name: "IX_playground_enrichments_UserId",
                table: "playground_enrichments",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_playground_enrichments_users_UserId",
                table: "playground_enrichments",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_playground_enrichments_users_UserId",
                table: "playground_enrichments");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropIndex(
                name: "IX_playground_enrichments_UserId",
                table: "playground_enrichments");

            migrationBuilder.DropColumn(
                name: "TransportLocation",
                table: "playground_enrichments");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "playground_enrichments");

            migrationBuilder.AlterColumn<string>(
                name: "TransportInfo",
                table: "playground_enrichments",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: false);

            migrationBuilder.RenameColumn(
                name: "TransportInfo",
                table: "playground_enrichments",
                newName: "Parking");
        }
    }
}
