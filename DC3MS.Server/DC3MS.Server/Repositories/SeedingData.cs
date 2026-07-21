using DC3MS.Server.Models;
using Microsoft.AspNetCore.Identity;

namespace DC3MS.Server.Repositories
{
    public static class SeedingData
    {
        public static async Task SeedData(
            IServiceProvider serviceProvider)
        {
            var roleManager =
                serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            var userManager =
                serviceProvider.GetRequiredService<UserManager<AppUserModel>>();

            // ==========================
            // CREATE ROLES
            // ==========================

            string[] roles =
            {
                "Citizen",
                "RescueTeam",
                "Admin",
                "SuperAdmin"
            };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(
                        new IdentityRole(role));
                }
            }

            // ==========================
            // CREATE SUPER ADMIN
            // ==========================

            var superAdmin =
                await userManager.FindByNameAsync("superadmin");

            if (superAdmin == null)
            {
                superAdmin = new AppUserModel
                {
                    UserName = "superadmin",
                    Email = "superadmin@dc3ms.com",
                    FullName = "System Super Admin",

                    PhoneNumber = "0900000000",

                    EmailConfirmed = true,
                    PhoneNumberConfirmed = true
                };

                var result =
                    await userManager.CreateAsync(
                        superAdmin,
                        "SuperAdmin@123"
                    );

                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(
                        superAdmin,
                        "SuperAdmin"
                    );
                }
            }

        }

    }
}
