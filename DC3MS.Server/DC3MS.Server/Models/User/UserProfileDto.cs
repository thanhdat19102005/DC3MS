using System.ComponentModel.DataAnnotations.Schema;

namespace DC3MS.Server.Models.User
{
    public class UserProfileDto
    {

        public string? Id { get; set; }
        public string? FullName { get; set; }

        public string? Email { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Address { get; set; }

        public string? AvatarUrl { get; set; }

        // File ảnh avatar gửi từ Angular lên
        // Không lưu trực tiếp xuống database
        [NotMapped]
        public IFormFile? FileAttachments { get; set; }

    }
}
