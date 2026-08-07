using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddZoneToServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TenantProfiles_RoomId",
                table: "TenantProfiles");

            migrationBuilder.AddColumn<Guid>(
                name: "ZoneId",
                table: "Services",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantProfiles_RoomId",
                table: "TenantProfiles",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_Services_ZoneId",
                table: "Services",
                column: "ZoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Zones_ZoneId",
                table: "Services",
                column: "ZoneId",
                principalTable: "Zones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Zones_ZoneId",
                table: "Services");

            migrationBuilder.DropIndex(
                name: "IX_TenantProfiles_RoomId",
                table: "TenantProfiles");

            migrationBuilder.DropIndex(
                name: "IX_Services_ZoneId",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "ZoneId",
                table: "Services");

            migrationBuilder.CreateIndex(
                name: "IX_TenantProfiles_RoomId",
                table: "TenantProfiles",
                column: "RoomId",
                unique: true);
        }
    }
}
