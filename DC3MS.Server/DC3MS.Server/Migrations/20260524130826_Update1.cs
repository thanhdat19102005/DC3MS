using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DC3MS.Server.Migrations
{
    /// <inheritdoc />
    public partial class Update1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RescueTeamId",
                table: "AspNetUsers",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_RescueTeamId",
                table: "AspNetUsers",
                column: "RescueTeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_RescueTeams_RescueTeamId",
                table: "AspNetUsers",
                column: "RescueTeamId",
                principalTable: "RescueTeams",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_RescueTeams_RescueTeamId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_RescueTeamId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "RescueTeamId",
                table: "AspNetUsers");
        }
    }
}
