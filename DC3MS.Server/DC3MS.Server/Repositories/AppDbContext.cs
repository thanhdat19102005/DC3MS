using DC3MS.Server.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DC3MS.Server.Repositories
{
    public class AppDbContext : IdentityDbContext<AppUserModel>
    {

        public AppDbContext(DbContextOptions<AppDbContext> options)
          : base(options)
        {
        }

        public DbSet<RescueRequest> RescueRequests { get; set; }


        public DbSet<RescueTeam> RescueTeams { get; set; }



        public DbSet<RescueChatMessage> RescueChatMessages{ get;set; }


        public DbSet<SmsHistory> SmsHistories { get; set; }


        public DbSet<ReceivedSms> ReceivedSmsMessages { get; set; }



        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<AppUserModel>()
                .HasIndex(x => x.PhoneNumber)
                .IsUnique()
                .HasFilter("[PhoneNumber] IS NOT NULL");
        }


    }
}

