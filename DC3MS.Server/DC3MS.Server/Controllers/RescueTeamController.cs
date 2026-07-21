using DC3MS.Server.Models;
using DC3MS.Server.Models.Auth;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace DC3MS.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Khuyến khích giữ "api/[controller]" để đồng bộ với Angular
    public class RescueTeamController : ControllerBase
    {
        private readonly AppDbContext _dataContext;
        private readonly UserManager<AppUserModel> _userManage;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public RescueTeamController(AppDbContext dataContext, UserManager<AppUserModel> userManage, IWebHostEnvironment webHostEnvironment)
        {
            _dataContext = dataContext;
            _userManage = userManage;
            _webHostEnvironment   = webHostEnvironment;
        }

        /// <summary>
        /// GET: api/RescueTeam
        /// Lấy toàn bộ danh sách đội cứu hộ
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RescueTeam>>> GetAllTeams()
        {
            var teams = await _dataContext.RescueTeams.ToListAsync();
            return Ok(teams);
        }





        // =====================================================
        // GET: api/RescueTeam/active-teams
        // Lấy tất cả đội cứu hộ đang hoạt động
        // Status:
        // 0 = Ngừng hoạt động
        // 1 = Tạm nghỉ
        // 2 = Đang trực / đang hoạt động
        // Dùng cho bản đồ phía người dân
        // =====================================================
        [HttpGet("active-teams")]
        public async Task<IActionResult> GetActiveTeams()
        {
            var teams = await _dataContext.RescueTeams
                .Where(t => t.Status == 2)
                .Select(t => new
                {
                    id = t.Id,
                    teamName = t.TeamName,
                    memberCount = t.MemberCount,
                    contactPhone = t.ContactPhone,
                    province = t.Province,
                    district = t.District,
                    description = t.Description,
                    latitude = t.Latitude,
                    longitude = t.Longitude,
                    avatarUrl = t.AvatarUrl,
                    status = t.Status
                })
                .ToListAsync();

            return Ok(new
            {
                total = teams.Count,
                teams = teams
            });
        }










        /// <summary>
        /// GET: api/RescueTeam/{id}
        /// Lấy thông tin chi tiết một đội theo Id
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<RescueTeam>> GetTeamById(string id)
        {
            var team = await _dataContext.RescueTeams.FindAsync(id);

            if (team == null)
            {
                return NotFound(new { message = $"Không tìm thấy đội cứu hộ nào có mã là '{id}'" });
            }

            return Ok(team);
        }


        [Authorize(Roles = "RescueTeam")]
        [HttpGet("request-detail/{id}")]
        public async Task<IActionResult> GetRequestDetail(int id)
        {
            var request = await _dataContext.RescueRequests
                .FirstOrDefaultAsync(x => x.Id == id);

            if (request == null)
            {
                return NotFound(new
                {
                    message = $"Không tìm thấy yêu cầu #{id}"
                });
            }

            return Ok(request);
        }






        /// <summary>
        /// POST: api/RescueTeam
        /// Thêm mới một đội cứu hộ (Id tự truyền bằng tay từ Client)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<RescueTeam>> CreateTeam([FromBody] RescueTeam teamInput)
        {
            if (string.IsNullOrEmpty(teamInput.Id))
            {
                return BadRequest(new { message = "Id của đội cứu hộ không được để trống." });
            }

            // Kiểm tra trùng Khóa chính (Id) vì bạn cấu hình tự truyền Id bằng tay
            var isExist = await _dataContext.RescueTeams.AnyAsync(t => t.Id == teamInput.Id);
            if (isExist)
            {
                return BadRequest(new { message = $"Mã đội cứu hộ '{teamInput.Id}' này đã tồn tại dưới Database." });
            }

            teamInput.CreatedAt = DateTime.Now;

            _dataContext.RescueTeams.Add(teamInput);
            await _dataContext.SaveChangesAsync();

            // Trả về object vừa tạo kèm link dẫn tới hàm GetById
            return CreatedAtAction(nameof(GetTeamById), new { id = teamInput.Id }, teamInput);
        }

        /// <summary>
        /// PUT: api/RescueTeam/{id}
        /// Cập nhật thông tin đội cứu hộ
        /// </summary>
        [Authorize(Roles = "RescueTeam")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTeam(string id, [FromForm] RescueTeam teamInput)
        {
         

            var existingTeam = await _dataContext.RescueTeams.FindAsync(id);

            if (existingTeam == null)
            {
                return NotFound(new { message = $"Không tìm thấy đội cứu hộ có mã '{id}' để cập nhật." });
            }

            existingTeam.TeamName = teamInput.TeamName;
            existingTeam.ContactPhone = teamInput.ContactPhone;
            existingTeam.Province = teamInput.Province;
            existingTeam.District = teamInput.District;
            existingTeam.Description = teamInput.Description;
            existingTeam.MemberCount = teamInput.MemberCount;
            // Cập nhật thêm các trường mới nếu có
            existingTeam.Status = teamInput.Status;



            // ===== THÊM: XỬ LÝ UPLOAD AVATAR / LOGO ĐỘI =====
            if (teamInput.FileAttachments != null)
            {
                string uploadsDir = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "teamAvatars"
                );

                if (!Directory.Exists(uploadsDir))
                {
                    Directory.CreateDirectory(uploadsDir);
                }

                string fileExtension = Path.GetExtension(teamInput.FileAttachments.FileName);

                string fileName = $"{Guid.NewGuid()}{fileExtension}";

                string filePath = Path.Combine(uploadsDir, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await teamInput.FileAttachments.CopyToAsync(stream);
                }

                // ===== LƯU ĐƯỜNG DẪN ẢNH VÀO DATABASE =====
                existingTeam.AvatarUrl = fileName;
            }

            existingTeam.UpdatedAt = DateTime.Now;

            await _dataContext.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thông tin đội cứu hộ thành công!",
                data = existingTeam
            });
        }
        /// <summary>
        /// DELETE: api/RescueTeam/{id}
        /// Xóa đội cứu hộ dựa vào Id
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeam(string id)
        {
            var team = await _dataContext.RescueTeams.FindAsync(id);
            if (team == null)
            {
                return NotFound(new { message = $"Không tìm thấy đội cứu hộ có mã '{id}' để xóa." });
            }

            _dataContext.RescueTeams.Remove(team);
            await _dataContext.SaveChangesAsync();

            return Ok(new { message = $"Đã xóa thành công đội cứu hộ có Id: {id}" });
        }





        //[Authorize]
        //[HttpGet("my-team-requests/{phoneNumber}")]
        //public async Task<IActionResult> GetTeamRequestsByPhoneNumber(string phoneNumber)
        //{
        //    // 1. Tìm User (Đội trưởng hoặc nhân viên) bằng Số điện thoại
        //    var user = await _userManage.Users
        //        .Include(u => u.RescueTeam) // Join sang RescueTeam
        //        .FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);

        //    if (user == null)
        //        return NotFound(new { message = "Không tìm thấy người dùng với số điện thoại này." });

        //    if (string.IsNullOrEmpty(user.RescueTeamId))
        //        return BadRequest(new { message = "Người dùng này không thuộc quản lý của đội cứu hộ nào." });

        //    // 2. Lấy danh sách các yêu cầu (RescueRequests) của đội đó
        //    // Join từ RescueTeam sang RescueRequests thông qua Entity Framework
        //    var teamRequests = await _dataContext.RescueRequests
        //        .Where(r => r.RescueTeamId == user.RescueTeamId)
        //        .OrderByDescending(r => r.CreatedAt) // Sắp xếp cái mới nhất lên đầu
        //        .ToListAsync();

        //    // 3. Trả về kết quả kèm thông tin đội để Front-end dễ hiển thị
        //    return Ok(new
        //    {
        //        teamName = user.RescueTeam.TeamName,
        //        totalRequests = teamRequests.Count,
        //        requests = teamRequests
        //    });
        //}



        // Lấy danh sách các yêu cầu đang chờ ứng cứu (Status = 0) của đội cứu hộ đang đăng nhập
        [Authorize(Roles = "RescueTeam")]// Chỉ cho phép role RescueTeam truy cập
        [HttpGet("my-team-requests")]
        public async Task<IActionResult> GetMyTeamRequests()
        {
            // 1. Lấy Email trực tiếp từ JWT (Token) của người đang đăng nhập
            var userEmail = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(userEmail))
                return Unauthorized(new { message = "Không xác định được thông tin người dùng từ Token." });

            // 2. Tìm User dựa trên Email đó
            // Lưu ý: Đã Include RescueTeam để lấy thông tin đội
            var user = await _userManage.Users
                .Include(u => u.RescueTeam)
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng này trong hệ thống." });

            if (string.IsNullOrEmpty(user.RescueTeamId))
                return BadRequest(new { message = "Người dùng này hiện không thuộc quản lý của đội cứu hộ nào." });

            // 3. Lấy danh sách yêu cầu (RescueRequests) của đội đó
            var teamRequests = await _dataContext.RescueRequests
                .Where(r => r.RescueTeamId == user.RescueTeamId && r.Status == 0 )
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            // 4. Trả về kết quả
            return Ok(new
            {
                teamName = user.RescueTeam.TeamName,
                totalRequests = teamRequests.Count,
                requests = teamRequests
            });
        }




        // Lấy danh sách các yêu cầu đang được đội cứu hộ đang đăng nhập ứng cứu (Status = 1)
        [Authorize(Roles = "RescueTeam")]
        [HttpGet("my-rescuing-requests")]
        public async Task<IActionResult> GetMyRescuingRequests()
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(userEmail))
                return Unauthorized(new { message = "Không xác định được thông tin người dùng từ Token." });

            var user = await _userManage.Users
                .Include(u => u.RescueTeam)
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng này trong hệ thống." });

            if (string.IsNullOrEmpty(user.RescueTeamId))
                return BadRequest(new { message = "Người dùng này hiện không thuộc quản lý của đội cứu hộ nào." });

            var rescuingRequests = await _dataContext.RescueRequests
                .Where(r => r.RescueTeamId == user.RescueTeamId && r.Status == 1)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(new
            {
                teamName = user.RescueTeam.TeamName,
                totalRescuing = rescuingRequests.Count,
                requests = rescuingRequests
            });
        }






        // Lấy danh sách các yêu cầu đã hoàn thành (Status = 2) của đội cứu hộ đang đăng nhập
        [Authorize(Roles = "RescueTeam")]
        [HttpGet("my-completed-requests")]
        public async Task<IActionResult> GetMyCompletedRequests()
        {
            // 1. Lấy User đang đăng nhập
            var userEmail = User.FindFirstValue(ClaimTypes.Email);
            var user = await _userManage.Users
                .Include(u => u.RescueTeam)
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (user == null || string.IsNullOrEmpty(user.RescueTeamId))
                return BadRequest(new { message = "Không xác định được đội cứu hộ." });

            // 2. Lấy danh sách các yêu cầu có Status = 2 (Đã hoàn thành)
            var completedRequests = await _dataContext.RescueRequests
                .Where(r => r.RescueTeamId == user.RescueTeamId && r.Status == 2)
                .OrderByDescending(r => r.CompletedAt) // Sắp xếp theo thời gian hoàn thành
                .ToListAsync();

            return Ok(new
            {
                teamName = user.RescueTeam.TeamName,
                totalCompleted = completedRequests.Count,
                requests = completedRequests
            });
        }


        // chuyển trạng thái yêu cầu từ đang chờ ứng cứu (Status = 0) sang đang ứng cứu (Status = 1)
        [Authorize(Roles = "RescueTeam")]
        [HttpPut("accept-request/{requestId}")]
        public async Task<IActionResult> AcceptRequest(int requestId)
        {
            var request = await _dataContext.RescueRequests.FindAsync(requestId);

            if (request == null)
                return NotFound(new { message = $"Không tìm thấy yêu cầu #{requestId}." });

            if (request.Status != 0)
                return BadRequest(new { message = "Yêu cầu này không còn ở trạng thái chờ xử lý." });

            request.Status = 1;

            await _dataContext.SaveChangesAsync();

            return Ok(new { message = $"Đã nhận ứng cứu yêu cầu #{requestId}." });
        }






        // chuyển trạng thái yêu cầu từ đang ứng cứu (Status = 1) sang đã hoàn thành (Status = 2)

        [Authorize(Roles = "RescueTeam")]
        [HttpPut("complete-request/{requestId}")]
        public async Task<IActionResult> CompleteRequest(int requestId)
        {
            var request = await _dataContext.RescueRequests.FindAsync(requestId);

            if (request == null)
                return NotFound(new { message = $"Không tìm thấy yêu cầu #{requestId}." });

            if (request.Status != 1)
                return BadRequest(new { message = "Chỉ có yêu cầu đang ứng cứu mới được hoàn thành." });

            request.Status = 2;
            request.CompletedAt = DateTime.Now;

            await _dataContext.SaveChangesAsync();

            return Ok(new { message = $"Đã hoàn thành yêu cầu #{requestId}." });
        }














        [Authorize(Roles = "RescueTeam,Admin,SuperAdmin")]
        [HttpDelete("cancel-request/{requestId}")]
        public async Task<IActionResult> CancelRequest(int requestId)
        {
            var request = await _dataContext.RescueRequests.FindAsync(requestId);

            if (request == null)
                return NotFound(new { message = $"Không tìm thấy yêu cầu #{requestId}." });

            await DeleteFiles(requestId); // Gọi hàm xóa file vật lý nếu có

            _dataContext.RescueRequests.Remove(request);
            await _dataContext.SaveChangesAsync();

            return Ok(new { message = $"Đã xóa thành công yêu cầu #{requestId}." });
        }



        // Delete yêu cầu cứu hộ và xóa file vật lý nếu có
        [NonAction]
        public async  Task DeleteFiles(int id)
        {
            // 1. Tìm bản ghi trong Database
            var request = await _dataContext.RescueRequests.FindAsync(id);

            if (request == null)
            {
                return;
                  
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

           
        }






        // =====================================================
        // GET: api/RescueTeam/my-team-profile
        // Lấy thông tin tài khoản đang đăng nhập + thông tin đội cứu hộ
        // Dùng cho trang Cài đặt
        // =====================================================
        [Authorize(Roles = "RescueTeam")]
        [HttpGet("my-team-profile")]
        public async Task<IActionResult> GetMyTeamProfile()
        {
            // ===== LẤY EMAIL TỪ TOKEN JWT =====
            var userEmail = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(userEmail))
            {
                return Unauthorized(new
                {
                    message = "Không xác định được email người dùng từ Token."
                });
            }

            // ===== JOIN APPUSER + RESCUETEAM =====
            var user = await _userManage.Users
                .Include(u => u.RescueTeam)
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản đội cứu hộ."
                });
            }

            if (string.IsNullOrEmpty(user.RescueTeamId) || user.RescueTeam == null)
            {
                return BadRequest(new
                {
                    message = "Tài khoản này chưa được gán vào đội cứu hộ."
                });
            }

            // ===== TRẢ DATA VỀ CHO ANGULAR =====
            return Ok(new
            {
                account = new
                {
                    userId = user.Id,
                    email = user.Email,
                    phoneNumber = user.PhoneNumber,
                    fullName = user.FullName,
                    address = user.Address,
                    occupation = user.Occupation,
                    rescueTeamId = user.RescueTeamId
                },

                team = new
                {
                    id = user.RescueTeam.Id,
                    teamName = user.RescueTeam.TeamName,
                    memberCount = user.RescueTeam.MemberCount,
                    contactPhone = user.RescueTeam.ContactPhone,
                    province = user.RescueTeam.Province,
                    district = user.RescueTeam.District,
                    description = user.RescueTeam.Description,
                    latitude = user.RescueTeam.Latitude,
                    longitude = user.RescueTeam.Longitude,
                    avatarUrl = user.RescueTeam.AvatarUrl,
                    createdAt = user.RescueTeam.CreatedAt,
                    updatedAt = user.RescueTeam.UpdatedAt,
                    status = user.RescueTeam.Status,

                }
            });
        }




        // =====================================================
        // PUT: api/RescueTeam/change-password
        // Đổi mật khẩu tài khoản đội cứu hộ đang đăng nhập
        // =====================================================
        [Authorize(Roles = "RescueTeam")]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto input)
        {
            var userEmail = User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(userEmail))
            {
                return Unauthorized(new
                {
                    message = "Không xác định được email người dùng từ Token."
                });
            }

            var user = await _userManage.Users
                .FirstOrDefaultAsync(u => u.Email == userEmail);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản đội cứu hộ."
                });
            }

            if (string.IsNullOrWhiteSpace(input.CurrentPassword))
            {
                return BadRequest(new
                {
                    message = "Vui lòng nhập mật khẩu hiện tại."
                });
            }

            if (string.IsNullOrWhiteSpace(input.NewPassword))
            {
                return BadRequest(new
                {
                    message = "Vui lòng nhập mật khẩu mới."
                });
            }

            if (input.NewPassword != input.ConfirmPassword)
            {
                return BadRequest(new
                {
                    message = "Mật khẩu xác nhận không khớp."
                });
            }

            var result = await _userManage.ChangePasswordAsync(
                user,
                input.CurrentPassword,
                input.NewPassword
            );

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Đổi mật khẩu thất bại.",
                    errors = result.Errors.Select(e => e.Description)
                });
            }

            return Ok(new
            {
                message = "Đổi mật khẩu thành công."
            });
        }









    }
}







