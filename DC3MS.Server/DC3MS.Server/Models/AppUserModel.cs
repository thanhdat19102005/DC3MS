using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DC3MS.Server.Models
{
    public class AppUserModel : IdentityUser
    {
        public string? Occupation { get; set; }
        public string  ? Address { get; set; }
        public string? FullName { get; set; }
        public string? RoleId { get; set; }
        public string? Token { get; set; }



        // --- Khóa ngoại nối tới RescueTeam ---
        public string? RescueTeamId { get; set; }

        [ForeignKey("RescueTeamId")]
        public virtual RescueTeam? RescueTeam { get; set; }





        [StringLength(500)]
        public string? AvatarUrl { get; set; }

        // =========================
        // FILE ẢNH GỬI TỪ ANGULAR
        // CHỈ DÙNG ĐỂ NHẬN FILE
        // KHÔNG LƯU XUỐNG DATABASE
        // =========================

        [NotMapped]
        public IFormFile? FileAttachments { get; set; }




    }
}
