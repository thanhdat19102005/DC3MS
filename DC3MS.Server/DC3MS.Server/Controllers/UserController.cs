using DC3MS.Server.Config;
using DC3MS.Server.Models;
using DC3MS.Server.Models.User;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace DC3MS.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _dataContext;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly UserManager<AppUserModel> _userManage;

        private readonly RescueSettings _options;

        public UserController(AppDbContext dataContext, IWebHostEnvironment webHostEnvironment, UserManager<AppUserModel> userManage, IOptions<RescueSettings> options)
        {
            this._dataContext = dataContext;
            _webHostEnvironment = webHostEnvironment;
            _userManage = userManage;
            _options = options.Value;
        }




        // =========================================================================
        // 🔍 🔥 THÊM MỚI: LẤY ĐƠN CỨU TRỢ HOẠT ĐỘNG CHÍNH CHỦ THEO EMAIL TOKEN
        // =========================================================================
        [Authorize]
        [HttpGet("my-active-request")]
        public async Task<IActionResult> GetActiveRequest()
        {
            // 1. Rút Email đã bẻ khóa sẵn từ RAM (HttpContext.User)
            var loggedInUserEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(loggedInUserEmail))
            {
                return Unauthorized(new { message = "Không tìm thấy thông tin email trong phiên đăng nhập." });
            }

            // 2. Tìm bản ghi User dưới DB xem Số điện thoại tài khoản là gì
            var currentUser = await _userManage.FindByEmailAsync(loggedInUserEmail);
            if (currentUser == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản tương ứng trên hệ thống." });
            }

            // 3. Tìm đơn cứu trợ mới nhất đang hoạt động (0: Chờ xử lý hoặc 1: Đang ứng cứu) của SĐT này
            var activeRequest = await _dataContext.RescueRequests
                .Include(r => r.RescueTeam) // Gộp thông tin Đội cứu hộ đang lo cho đơn này (nếu có)
                .Where(r => r.PhoneNumber == currentUser.PhoneNumber && (r.Status == 0 || r.Status == 1))
                .FirstOrDefaultAsync();

            if (activeRequest == null)
            {
                return NotFound(new { message = "Bạn hiện không có yêu cầu ứng cứu nào đang trong tiến trình xử lý." });
            }

            //// Ngắt vòng lặp liên kết JSON (Circular Reference) để tránh lỗi gọi API
            //if (activeRequest.RescueTeam != null)
            //{
            //    activeRequest.RescueTeam.RescueRequests = null;
            //}

            return Ok(activeRequest);
        }






        [Authorize]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromForm] RescueRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);


            // =========================================================================
            // 🛡️ TẦNG BẢO MẬT: KIỂM TRA THÔNG TIN TÀI KHOẢN QUA EMAIL ()
            // =========================================================================
            // 1. Rút Email đã bẻ khóa sẵn từ HttpContext.User trên RAM
            var loggedInUserEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(loggedInUserEmail))
            {
                return Unauthorized(new { message = "Không tìm thấy thông tin email trong phiên đăng nhập." });
            }

            // 2. Gọi Identity tìm bản ghi User dưới Database bằng Email
            var currentUser = await _userManage.FindByEmailAsync(loggedInUserEmail);
            if (currentUser == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản tương ứng với email này trên hệ thống." });
            }

            // 3. Chặn lại nếu tài khoản chưa cập nhật SĐT hoặc Địa chỉ
            if (string.IsNullOrEmpty(currentUser.PhoneNumber) || string.IsNullOrEmpty(currentUser.Address))
            {
                return BadRequest(new
                {
                    code = "INCOMPLETE_PROFILE",
                    message = "Tài khoản của bạn chưa cập nhật đầy đủ Số điện thoại hoặc Địa chỉ hiện tại. Vui lòng bổ sung thông tin trước khi gửi yêu cầu cứu trợ!"
                });
            }

            // 4. TỰ ĐỘNG LẤY THÔNG TIN CHÍNH CHỦ GÁN VÀO ĐƠN CỨU TRỢ (Đồng bộ, chống sửa đổi)
            // LƯU Ý: Đạt chỉnh lại tên thuộc tính (PhoneNumber / SenderName) cho đúng với Model DB của bạn nhé
            request.PhoneNumber = currentUser.PhoneNumber;
            request.SenderName = currentUser.FullName;





            // =========================================================================
            // 🚫 TẦNG CHỐNG SPAM: KIỂM TRA ĐƠN CỨU TRỢ TRƯỚC ĐÓ CỦA USER
            // =========================================================================
            // Quét tìm xem số điện thoại này có đơn nào ở trạng thái 0 (Chờ xử lý) hoặc 1 (Đang ứng cứu) hay không
            var activeRequest = await _dataContext.RescueRequests
                .Where(r => r.PhoneNumber == currentUser.PhoneNumber && (r.Status == 0 || r.Status == 1))
                .FirstOrDefaultAsync();

            if (activeRequest != null)
            {
                return BadRequest(new
                {
                    code = "SPAM_BLOCKED",
                    message = "Bạn đang có yêu cầu cứu trợ đang được xử lý. Để chống spam, nếu muốn thay đổi thông tin vui lòng chỉ chỉnh sửa lại đơn hiện tại!"
                });
            }






            // =========================================================================
            // 1. KIỂM TRA VÀ XỬ LÝ LƯU DANH SÁCH FILE ẢNH/VIDEO GỬI LÊN
            // =========================================================================
            if (request.FileAttachments != null && request.FileAttachments.Count > 0)
            {
                string uploadsDir = Path.Combine(_webHostEnvironment.WebRootPath, "rescueImages");
                if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

                List<string> savedFileNameList = new List<string>();

                foreach (var file in request.FileAttachments)
                {
                    if (file.Length > 0)
                    {
                        // Tạo tên file duy nhất
                        string fileName = Guid.NewGuid().ToString() + "_" + file.FileName;
                        string filePath = Path.Combine(uploadsDir, fileName);

                        using (var fs = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fs);
                        }
                        savedFileNameList.Add(fileName); // Thêm tên file vào danh sách tạm
                    }
                }

                // Nối các tên file lại thành chuỗi: "anh1.jpg,anh2.jpg" để lưu vào cột MediaPaths
                request.MediaPaths = string.Join(",", savedFileNameList);
            }
            else
            {
                request.MediaPaths = "noimage.jpg";
            }

            // =========================================================================
            // 2. THỰC HIỆN BỘ LỌC 2 TẦNG ĐỂ QUÉT TÌM ĐỘI CỨU HỘ XUNG QUANH
            // =========================================================================
            double radiusInKm = _options.RadiusInKm; // Bán kính quét cứu hộ (50km)
            double userLat = request.Latitude;
            double userLng = request.Longitude;

            // Quy đổi bán kính km ra độ sai lệch toán học trên mặt cầu
            double latDelta = radiusInKm / 111.0;
            double lngDelta = radiusInKm / (111.0 * Math.Cos(userLat * Math.PI / 180.0));

            double minLat = userLat - latDelta;
            double maxLat = userLat + latDelta;
            double minLng = userLng - lngDelta;
            double maxLng = userLng + lngDelta;

            // TẦNG 1: Ép SQL Server lọc nhanh hình vuông dưới Database (Tối ưu hiệu năng toàn quốc)
            // CHỈ LẤY ĐỘI ĐANG TRỰC
            // Status:
            // 0 = Ngừng hoạt động
            // 1 = Tạm nghỉ
            // 2 = Đang trực
            // Chỉ đội có Status == 2 mới được nhận yêu cầu cứu hộ mới
            // =========================================================================
            var roughTeams = await _dataContext.RescueTeams
                .Where(t => t.Status == 2
                         && t.Latitude >= minLat && t.Latitude <= maxLat
                         && t.Longitude >= minLng && t.Longitude <= maxLng)
                .ToListAsync();

            // TẦNG 2: Dùng công thức Haversine cắt góc hình tròn chính xác trên RAM Server
            var nearbyTeams = roughTeams.Where(t => CalculateDistance(userLat, userLng, t.Latitude, t.Longitude) <= radiusInKm).ToList();

            // =========================================================================
            // 3. ĐÁNH DẤU LUỒNG ĐIỀU PHỐI: TỰ ĐỘNG GÁN ĐỘI GẦN NHẤT TUYỆT ĐỐI THEO Ý ĐẠT
            // =========================================================================
            // Thay vì dùng .Any() dễ dính bẫy lỗi danh sách trống, ta bốc thử ông đầu tiên ra luôn
            var closestTeam = nearbyTeams
                .OrderBy(t => CalculateDistance(userLat, userLng, t.Latitude, t.Longitude))
                .FirstOrDefault();

            // KIỂM TRA: Nếu thực sự tìm thấy ít nhất 1 đội (closestTeam không bị rỗng/null)
            if (closestTeam != null)
            {
                // TÍNH KHOẢNG CÁCH MỘT LẦN NỮA HOẶC LẤY TỪ ORDERBY
                double dist = CalculateDistance(userLat, userLng, closestTeam.Latitude, closestTeam.Longitude);

                // GÁN VÀO ĐỐI TƯỢNG REQUEST ĐỂ LƯU VÀO DB
                request.Distance = dist;

                request.ResolutionNotes = $"[HỆ THỐNG]: Tìm thấy {nearbyTeams.Count} đội. Đã tự động chỉ định cho Đội gần nhất: {closestTeam.TeamName} (Cách {dist:F2} km).";
                request.RescueTeamId = closestTeam.Id;
            }
            else
            {
                // Nếu vùng trắng, ta để khoảng cách là 0 hoặc giá trị mặc định
                request.Distance = 0;
                request.ResolutionNotes = $"[HỆ THỐNG]: Vùng trắng cứu hộ (Không có đội nào trong bán kính {radiusInKm}km).";
                request.RescueTeamId = null;
            }

            // =========================================================================
            // 4. LƯU VÀO DATABASE VÀ TRẢ KẾT QUẢ VỀ CHO ANGULAR
            // =========================================================================
            _dataContext.RescueRequests.Add(request);
            await _dataContext.SaveChangesAsync();

            // --- THÊM DUY NHẤT DÒNG NÀY VÀO ĐỂ NGẮT VÒNG LẶP JSON ---
            request.RescueTeam = null;
            return Ok(new { message = "Thành công", data = request, nearbyTeamsCount = nearbyTeams.Count });
        }

        // =========================================================================
        // 5. CÁC HÀM TOÁN HỌC PHỤ TRỢ (HAVERSINE)
        // =========================================================================
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371; // Bán kính Trái Đất (km)
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);

            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        // Hàm đổi đơn vị từ góc Độ (Degree) sang Radian để máy tính xử lý được hàm Sin/Cos
        private double ToRadians(double angle) => (Math.PI / 180) * angle;

        // =========================================================================
        // 6. XÓA BẢN GHI VÀ DỌN DẸP FILE ẢNH VẬT LÝ TRÊN Ổ CỨNG
        // =========================================================================
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            // 1. Tìm bản ghi trong Database
            var request = await _dataContext.RescueRequests.FindAsync(id);

            if (request == null)
            {
                return NotFound(new { message = "Không tìm thấy yêu cầu cứu trợ" });
            }

            // 2. Xử lý xóa file vật lý trong thư mục rescueImage
            if (!string.IsNullOrEmpty(request.MediaPaths) && request.MediaPaths != "noimage.jpg")
            {
                string uploadsDir = Path.Combine(_webHostEnvironment.WebRootPath, "rescueImages");

                // Cắt chuỗi MediaPaths thành mảng các tên file
                // Ví dụ: "file1.jpg,file2.jpg" -> ["file1.jpg", "file2.jpg"]
                string[] fileNames = request.MediaPaths.Split(',');

                foreach (var fileName in fileNames)
                {
                    // Loại bỏ khoảng trắng thừa nếu có
                    string trimmedFileName = fileName.Trim();
                    string filePath = Path.Combine(uploadsDir, trimmedFileName);

                    // Kiểm tra file có tồn tại trên ổ cứng không rồi mới xóa
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                }
            }

            // 3. Xóa bản ghi trong Database
            _dataContext.RescueRequests.Remove(request);
            await _dataContext.SaveChangesAsync();

            return Ok(new { message = "Đã xóa yêu cầu cứu trợ và tất cả ảnh liên quan thành công" });
        }








        [Authorize]
        [HttpPut("{id}")] // Quy chuẩn RESTful: PUT /api/RescueRequests/{id}
        public async Task<IActionResult> Update(int id, [FromBody] RescueRequest updatedRequest)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // =========================================================================
            // 🛡️ TẦNG BẢO MẬT 1: XÁC THỰC TÀI KHOẢN ĐĂNG NHẬP
            // =========================================================================
            // 1. Lấy Email từ Claim nội bộ trên RAM
            var loggedInUserEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(loggedInUserEmail))
            {
                return Unauthorized(new { message = "Không tìm thấy thông tin email trong phiên đăng nhập." });
            }

            // 2. Tìm User thực tế dưới Database
            var currentUser = await _userManage.FindByEmailAsync(loggedInUserEmail);
            if (currentUser == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản tương ứng trên hệ thống." });
            }

            // =========================================================================
            // 🔍 TẦNG BẢO MẬT 2: KIỂM TRA ĐƠN CỨU TRỢ VÀ QUYỀN SỞ HỮU
            // =========================================================================
            // 3. Tìm bản ghi gốc đang lưu trong Database SQL Server
            var dbRequest = await _dataContext.RescueRequests.FindAsync(id);
            if (dbRequest == null)
            {
                return NotFound(new { message = $"Không tìm thấy yêu cầu cứu trợ có mã số {id} trên hệ thống." });
            }


            // 5. KHÓA ĐƠN ĐÃ XỬ LÝ XONG: Nếu trạng thái đã là Hoàn thành (2), không cho người dân tự ý sửa nữa
            if (dbRequest.Status == 2)
            {
                return BadRequest(new { message = "Yêu cầu cứu trợ này đã được đội cứu trợ hoàn thành xử lý. Bạn không thể chỉnh sửa thông tin này nữa." });
            }

            // =========================================================================
            // 📝 TẦNG ĐỒNG BỘ DỮ LIỆU CẬP NHẬT
            // =========================================================================
            // 6. Ánh xạ các trường dữ liệu nâng cao người dân vừa sửa đổi từ Angular form qua



            // [BỔ SUNG]: TỰ ĐỘNG TÍNH LẠI KHOẢNG CÁCH NẾU CÓ ĐỘI ĐANG PHỤ TRÁCH
            if (!string.IsNullOrEmpty(dbRequest.RescueTeamId))
            {
                // 1. Tìm thông tin đội đang phụ trách
                var assignedTeam = await _dataContext.RescueTeams
                    .FirstOrDefaultAsync(t => t.Id == dbRequest.RescueTeamId);

                if (assignedTeam != null)
                {
                    // 2. Tính lại khoảng cách mới dựa trên tọa độ mới của người dân
                    double newDist = CalculateDistance(
                        dbRequest.Latitude,
                        dbRequest.Longitude,
                        assignedTeam.Latitude,
                        assignedTeam.Longitude
                    );

                    // 3. Cập nhật vào DB
                    dbRequest.Distance = newDist;


                }
            }



            dbRequest.RescueType = updatedRequest.RescueType;
            dbRequest.UrgencyLevel = updatedRequest.UrgencyLevel;
            dbRequest.PeopleCount = updatedRequest.PeopleCount;
            dbRequest.HasChildren = updatedRequest.HasChildren;
            dbRequest.HasElderly = updatedRequest.HasElderly;
            dbRequest.HealthStatus = updatedRequest.HealthStatus;
            dbRequest.AlternativePhoneNumber = updatedRequest.AlternativePhoneNumber;
            dbRequest.Content = updatedRequest.Content;

            // 7. Bảo toàn tọa độ GPS mới nếu người dân có bấm nút cập nhật lại tọa độ trên Form
            dbRequest.Latitude = updatedRequest.Latitude;
            dbRequest.Longitude = updatedRequest.Longitude;

            // Tự động ghi nhận thời gian chỉnh sửa mới nhất (nếu DB của bạn có trường UpdatedAt)
            // dbRequest.UpdatedAt = DateTime.UtcNow;

            try
            {
                // 8. Lưu thay đổi xuống Database SQL Server
                _dataContext.RescueRequests.Update(dbRequest);
                await _dataContext.SaveChangesAsync();

                // Trả về kết quả thành công cho Angular nhận diện đổ Toast
                return Ok(new { message = "Đã cập nhật dữ liệu cứu trợ thành công!", data = dbRequest });
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(500, new { message = "Hệ thống bận hoặc có xung đột dữ liệu dòng thời gian, vui lòng thử lại sau!" });
            }
        }




        // ========================================================
        // LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP
        // ========================================================
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            // =========================
            // Lấy Email từ JWT Token
            // =========================
            var email = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized(new
                {
                    message = "Không tìm thấy email trong token."
                });
            }

            // =========================
            // Tìm User trong Identity
            // =========================
            var user = await _userManage.FindByEmailAsync(email);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản."
                });
            }

            // =========================
            // Trả dữ liệu về Frontend 
            // =========================
            var result = new UserProfileDto
            {
                Id  = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                AvatarUrl = user.AvatarUrl
            };

            return Ok(result);
        }


        // ========================================================
        // CẬP NHẬT THÔNG TIN USER ĐANG ĐĂNG NHẬP
        // - Họ tên
        // - Số điện thoại
        // - Địa chỉ
        // - Avatar
        // Email không cho sửa ở đây
        // ========================================================
        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromForm] UserProfileDto model)
        {
            // =========================
            // 1. Lấy Email từ JWT Token
            // =========================
            var email = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized(new
                {
                    message = "Không tìm thấy email trong token."
                });
            }

            // =========================
            // 2. Tìm User đang đăng nhập
            // =========================
            var user = await _userManage.FindByEmailAsync(email);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản."
                });
            }

            // =========================
            // 3. Cập nhật thông tin cơ bản
            // =========================
            user.FullName = model.FullName;
            user.PhoneNumber = model.PhoneNumber;
            user.Address = model.Address;

            // Không cập nhật Email ở đây để tránh lỗi đăng nhập / xác thực token
            // user.Email = model.Email;

            // =========================
            // 4. Xử lý upload avatar nếu có file mới
            // =========================
            if (model.FileAttachments != null && model.FileAttachments.Length > 0)
            {
                // Cho phép các định dạng ảnh
                var allowedExtensions = new[]
                {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

                var extension = Path.GetExtension(model.FileAttachments.FileName).ToLower();

                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new
                    {
                        message = "Chỉ cho phép upload ảnh JPG, JPEG, PNG hoặc WEBP."
                    });
                }

                // Giới hạn 2MB
                if (model.FileAttachments.Length > 2 * 1024 * 1024)
                {
                    return BadRequest(new
                    {
                        message = "Ảnh đại diện không được vượt quá 2MB."
                    });
                }

                // Thư mục lưu ảnh: wwwroot/userAvatars
                string uploadsDir = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "userAvatars"
                );

                if (!Directory.Exists(uploadsDir))
                {
                    Directory.CreateDirectory(uploadsDir);
                }

                // Xóa avatar cũ nếu có
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    string oldAvatarPath = Path.Combine(
                        uploadsDir,
                        user.AvatarUrl
                    );

                    if (System.IO.File.Exists(oldAvatarPath))
                    {
                        System.IO.File.Delete(oldAvatarPath);
                    }
                }

                // Tạo tên file mới
                string fileName = $"{Guid.NewGuid()}{extension}";

                string filePath = Path.Combine(
                    uploadsDir,
                    fileName
                );

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await model.FileAttachments.CopyToAsync(stream);
                }

                // Chỉ lưu tên file vào database
                user.AvatarUrl = fileName;
            }

            // =========================
            // 5. Lưu thay đổi vào AspNetUsers
            // =========================
            var updateResult = await _userManage.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Cập nhật thông tin thất bại.",
                    errors = updateResult.Errors
                });
            }

            // =========================
            // 6. Trả dữ liệu mới về Angular
            // =========================
            return Ok(new
            {
                message = "Cập nhật thông tin tài khoản thành công.",
                data = new UserProfileDto
                {
                    FullName = user.FullName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    Address = user.Address,
                    AvatarUrl = user.AvatarUrl
                }
            });
        }



        // ========================================================
        // ĐỔI MẬT KHẨU USER ĐANG ĐĂNG NHẬP
        // ========================================================
        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword(
            [FromBody] UserChangePasswordDto model)
        {
            // =========================
            // 1. Lấy Email từ Token
            // =========================
            var email = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized(new
                {
                    message = "Không tìm thấy thông tin đăng nhập."
                });
            }

            // =========================
            // 2. Tìm User
            // =========================
            var user = await _userManage.FindByEmailAsync(email);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản."
                });
            }

            // =========================
            // 3. Validate dữ liệu
            // =========================
            if (string.IsNullOrWhiteSpace(model.CurrentPassword))
            {
                return BadRequest(new
                {
                    message = "Vui lòng nhập mật khẩu hiện tại."
                });
            }

            if (string.IsNullOrWhiteSpace(model.NewPassword))
            {
                return BadRequest(new
                {
                    message = "Vui lòng nhập mật khẩu mới."
                });
            }

            if (model.NewPassword != model.ConfirmPassword)
            {
                return BadRequest(new
                {
                    message = "Mật khẩu xác nhận không khớp."
                });
            }

            if (model.CurrentPassword == model.NewPassword)
            {
                return BadRequest(new
                {
                    message = "Mật khẩu mới phải khác mật khẩu hiện tại."
                });
            }



            // =========================
            // 4. Đổi mật khẩu
            // =========================
            var result = await _userManage.ChangePasswordAsync(
                user,
                model.CurrentPassword,
                model.NewPassword
            );

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = result.Errors.FirstOrDefault()?.Description
                              ?? "Không thể đổi mật khẩu."
                });
            }

            // =========================
            // 5. Thành công
            // =========================
            return Ok(new
            {
                message = "Đổi mật khẩu thành công."
            });
        }




        // ========================================================
        // LẤY TỌA ĐỘ YÊU CẦU ĐANG HOẠT ĐỘNG CỦA USER
        // Status = 0 hoặc 1
        // ========================================================
        [Authorize]
        [HttpGet("my-active-request-location")]
        public async Task<IActionResult> GetMyActiveRequestLocation()
        {
            // =====================================
            // 1. Lấy Email từ JWT
            // =====================================
            var email = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized(new
                {
                    message = "Không tìm thấy thông tin đăng nhập."
                });
            }

            // =====================================
            // 2. Tìm User
            // =====================================
            var user = await _userManage.FindByEmailAsync(email);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản."
                });
            }

            // =====================================
            // 3. Tìm yêu cầu đang hoạt động
            // =====================================
            var request = await _dataContext.RescueRequests
                .Where(r =>
                    r.PhoneNumber == user.PhoneNumber &&
                    (r.Status == 0 || r.Status == 1))
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            if (request == null)
            {
                return NotFound(new
                {
                    message = "Không có yêu cầu cứu trợ đang hoạt động."
                });
            }

            // =====================================
            // 4. Trả tọa độ
            // =====================================
            return Ok(new
            {
                requestId = request.Id,

                senderName = request.SenderName,
                phoneNumber = request.PhoneNumber,

                rescueType = request.RescueType,
                urgencyLevel = request.UrgencyLevel,
                content = request.Content,

                latitude = request.Latitude,
                longitude = request.Longitude,

                status = request.Status,
                createdAt = request.CreatedAt
            });
        }



































    }
}