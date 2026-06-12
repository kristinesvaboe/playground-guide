using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace PlaygroundGuide.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "playgrounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OsmNodeId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    Location = table.Column<Point>(type: "geometry", nullable: false),
                    OsmTags = table.Column<string>(type: "jsonb", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_playgrounds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "playground_enrichments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlaygroundId = table.Column<Guid>(type: "uuid", nullable: false),
                    Equipment = table.Column<List<string>>(type: "text[]", nullable: false),
                    Parking = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Reviewed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_playground_enrichments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_playground_enrichments_playgrounds_PlaygroundId",
                        column: x => x.PlaygroundId,
                        principalTable: "playgrounds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_playground_enrichments_PlaygroundId",
                table: "playground_enrichments",
                column: "PlaygroundId");

            migrationBuilder.CreateIndex(
                name: "IX_playgrounds_Location",
                table: "playgrounds",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_playgrounds_OsmNodeId",
                table: "playgrounds",
                column: "OsmNodeId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "playground_enrichments");

            migrationBuilder.DropTable(
                name: "playgrounds");
        }
    }
}
