using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DC3MS.Server.Models
{
    public class RescueRequest
    {
        /// <summary>
        /// Mã số hiệu của ca cứu trợ. Tự động tăng (1, 2, 3...) giúp dễ gọi tên ca trực qua bộ đàm.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        /// <summary>
        /// Họ và tên của người đang gặp nạn hoặc người đại diện gửi yêu cầu.
        /// </summary>
        [Required(ErrorMessage = "Vui lòng nhập tên người cần hỗ trợ")]
        public string SenderName { get; set; }

        /// <summary>
        /// Số điện thoại dùng để đội cứu hộ gọi lại xác nhận vị trí hoặc hướng dẫn sơ cứu.
        /// </summary>
        [Required(ErrorMessage = "Vui lòng nhập số điện thoại liên lạc")]
        [Phone(ErrorMessage = "Số điện thoại không đúng định dạng")]
        public string PhoneNumber { get; set; }

        /// <summary>
        /// Phân loại khẩn cấp: Y tế, Lương thực, Cứu hộ xuồng, Di dời dân...
        /// </summary>
        [Required]
        public string RescueType { get; set; }

        /// <summary>
        /// Chi tiết tình trạng hiện tại (Dữ liệu chuyển từ giọng nói hoặc nhập tay).
        /// Ví dụ: "Nước dâng cao, có người già đang sốt".
        /// </summary>
        [Required]
        public string Content { get; set; }

        /// <summary>
        /// Vĩ độ (Latitude) lấy từ GPS của điện thoại người dân.
        /// </summary>
        public double Latitude { get; set; }

        /// <summary>
        /// Kinh độ (Longitude) lấy từ GPS của điện thoại người dân.
        /// </summary>
        public double Longitude { get; set; }

        /// <summary>
        /// Lưu đường dẫn/tên các file ảnh hoặc video đã upload (ngăn cách bằng dấu phẩy).
        /// </summary>
        public string? MediaPaths { get; set; } = "noimage.jpg";



        /// <summary>
        /// Trạng thái yêu cầu: 0: Chờ xử lý, 1: Đang ứng cứu, 2: Hoàn thành, 3: Đã hủy.
        /// </summary>
        public int Status { get; set; } = 0;

        /// <summary>
        /// Thời điểm chính xác người dân bấm nút gửi yêu cầu.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        /// <summary>
        /// Ghi nhận thời điểm đội cứu hộ bắt đầu nhận ca và lên đường.
        /// </summary>
        public DateTime? PickedUpAt { get; set; }

        /// <summary>
        /// Ghi nhận thời điểm cứu hộ thành công, giúp thống kê thời gian phản ứng.
        /// </summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// Ghi chú từ đội cứu hộ sau khi xong: "Đã chuyển nạn nhân lên trạm y tế tuyến trên".
        /// </summary>
        public string? ResolutionNotes { get; set; }

        /// <summary>
        /// ID hoặc Tên của nhân viên/tổ chức cứu hộ chịu trách nhiệm ca này.
        /// </summary>
        public string? RescueTeamId { get; set; }


        // --- THÊM DÒNG NÀY ĐỂ TẠO MỐI QUAN HỆ FOREIGN KEY ---
        [ForeignKey("RescueTeamId")]
        public virtual RescueTeam? RescueTeam { get; set; }





        /// <summary>
        /// Dữ liệu file ảnh/video vật lý gửi từ Angular lên (Chỉ dùng để xử lý, không lưu vào bảng SQL).
        /// </summary>
        [NotMapped]
        public List<IFormFile>? FileAttachments { get; set; }







        // =========================================================================
        // 🔥 CÁC TRƯỜNG DỮ LIỆU MỚI CHO  FORM CỨU TRỢ CHI TIET    
        // =========================================================================

        /// <summary>
        /// Mức độ khẩn cấp: Bình thường, Khẩn cấp, Nguy kịch... (Chọn từ Dropdown)
        /// </summary>
        [Required(ErrorMessage = "Vui lòng chọn mức độ khẩn cấp")]
        public string UrgencyLevel { get; set; } = "Bình thường";

        /// <summary>
        /// Số lượng người đang bị cô lập cần được cứu trợ trong hộ/nhóm.
        /// </summary>
        [Required(ErrorMessage = "Vui lòng nhập số người cần cứu trợ")]
        [Range(1, 100, ErrorMessage = "Số người cần cứu trợ phải tối thiểu là 1")]
        public int PeopleCount { get; set; } = 1;

        /// <summary>
        /// Đánh dấu xem trong nhóm người bị nạn có trẻ em hay không.
        /// </summary>
        public bool HasChildren { get; set; } = false;

        /// <summary>
        /// Đánh dấu xem trong nhóm người bị nạn có người già/cao tuổi hay không.
        /// </summary>
        public bool HasElderly { get; set; } = false;

        /// <summary>
        /// Tình trạng sức khỏe chung của các nạn nhân: Bình thường, Chấn thương, Đau ốm cấp tính...
        /// </summary>
        [Required]
        public string HealthStatus { get; set; } = "Bình thường";

        /// <summary>
        /// Số điện thoại liên hệ phụ / dự phòng (Nếu khác số điện thoại tài khoản đăng ký)
        /// </summary>
        public string? AlternativePhoneNumber { get; set; }

        // =========================================================================


        /// <summary>
        /// Khoảng cách từ vị trí cứu hộ đến vị trí người bị nạn (Đơn vị: Kilomet).
        /// </summary>
        public double Distance { get; set; } = 0.0;






    }
}