using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DC3MS.Server.Models
{
    public class RescueTeam
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public string Id { get; set; } // Xóa phần gán Guid ở đây để tự truyền bằng tay khi code

        [Required]
        [StringLength(150)]
        public string TeamName { get; set; }


        [Range(1, 100)]
        public int MemberCount { get; set; }


        [Required]
        [StringLength(15)]
        public string ContactPhone { get; set; }

        [Required]
        public string Province { get; set; }

        [Required]
        public string District { get; set; }

        public string Description { get; set; }

        // --- Thời gian ---
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }



        // ---   TRƯỜNG NÀY ĐỂ LƯU TỌA ĐỘ VỊ TRÍ CỦA ĐỘI TRỰC BẰNG GPS ---
        public double Latitude { get; set; }
        public double Longitude { get; set; }



        [StringLength(500)] // Giới hạn độ dài để tối ưu database
        public string? AvatarUrl { get; set; } // Dấu '?' cho phép trường này có thể null nếu đội chưa kịp cập nhật ảnh



        /// <summary>
        /// Dữ liệu file ảnh/video vật lý gửi từ Angular lên (Chỉ dùng để xử lý, không lưu vào bảng SQL).
        /// </summary>
        [NotMapped]
        public IFormFile? FileAttachments { get; set; }



        /// <summary>
        /// Trạng thái đội cứu hộ
        /// 0 = Ngừng hoạt động
        /// 1 = Tạm nghỉ
        /// 2 = Đang trực
        /// </summary>
        public int Status { get; set; } = 2;



        //// --- Quan hệ --- 
        //public List<RescueRequest> RescueRequests { get; set; } = new List<RescueRequest>();








    }
}
