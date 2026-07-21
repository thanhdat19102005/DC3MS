using DC3MS.Server.Models;
using DC3MS.Server.Models.Admin;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DC3MS.Server.Controllers
{
    [Route("api/admin/rescue-teams")]
    [ApiController]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class AdminRescueTeamController : ControllerBase
    {
        private readonly UserManager<AppUserModel> _userManager;
        private readonly AppDbContext _context;

        public AdminRescueTeamController(
            UserManager<AppUserModel> userManager,
            AppDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        // GET: api/admin/rescue-teams
        // Chỉ load tài khoản trong bảng AspNetUsers có RescueTeamId != null
        [HttpGet]
        public async Task<IActionResult> GetRescueTeamAccounts()
        {
            var users = await _userManager.Users
                .Where(u => u.RescueTeamId != null)
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    userName = u.UserName,
                    email = u.Email,
                    phoneNumber = u.PhoneNumber,
                    address = u.Address,
                    avatarUrl = u.AvatarUrl,
                    rescueTeamId = u.RescueTeamId
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/admin/rescue-teams/detail/{rescueTeamId}
        // Chi tiết chỉ lấy dữ liệu từ bảng RescueTeams
        [HttpGet("detail/{rescueTeamId}")]
        public async Task<IActionResult> GetRescueTeamDetail(
            string rescueTeamId)
        {
            var team = await _context.RescueTeams
                .Where(t => t.Id == rescueTeamId)
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
                    status = t.Status,
                    createdAt = t.CreatedAt,
                    updatedAt = t.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (team == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy thông tin đội cứu hộ."
                });
            }

            return Ok(team);
        }

        // DELETE: api/admin/rescue-teams/{id}
        // Xóa tài khoản AspNetUsers
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRescueTeamAccount(string id)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u =>
                    u.Id == id &&
                    u.RescueTeamId != null);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản đội cứu hộ."
                });
            }

            var rescueTeamId = user.RescueTeamId;

            var deleteUserResult = await _userManager.DeleteAsync(user);

            if (!deleteUserResult.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Xóa tài khoản đội cứu hộ thất bại.",
                    errors = deleteUserResult.Errors.Select(e => e.Description)
                });
            }

            var rescueTeam = await _context.RescueTeams
                .FirstOrDefaultAsync(x => x.Id == rescueTeamId);

            if (rescueTeam != null)
            {
                _context.RescueTeams.Remove(rescueTeam);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = "Đã xóa tài khoản và đội cứu hộ thành công."
            });
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRescueTeamAccount(
    string id,
    [FromBody] UpdateRescueTeamAccountDto model)
        {
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u =>
                    u.Id == id &&
                    u.RescueTeamId != null);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản đội cứu hộ."
                });
            }

            user.FullName = model.FullName;
            user.UserName = model.UserName;
            user.NormalizedUserName = model.UserName?.ToUpper();
            user.Email = model.Email;
            user.NormalizedEmail = model.Email?.ToUpper();
            user.PhoneNumber = model.PhoneNumber;
            user.Address = model.Address;

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = "Cập nhật tài khoản thất bại.",
                    errors = result.Errors.Select(e => e.Description)
                });
            }

            return Ok(new
            {
                message = "Cập nhật tài khoản đội cứu hộ thành công."
            });
        }

        [HttpPost("create-team-with-account")]
        public async Task<IActionResult> CreateTeamWithAccount(
            [FromBody] CreateTeamWithAccountDto model)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existsTeam = await _context.RescueTeams
                    .AnyAsync(x => x.Id == model.RescueTeamId);

                if (existsTeam)
                {
                    return BadRequest(new { message = "Mã đội cứu hộ đã tồn tại." });
                }

                var phoneExists = await _userManager.Users
                    .AnyAsync(x => x.PhoneNumber == model.PhoneNumber);

                if (phoneExists)
                {
                    return BadRequest(new { message = "Số điện thoại tài khoản đã tồn tại." });
                }

                var rescueTeam = new RescueTeam
                {
                    Id = model.RescueTeamId,
                    TeamName = model.TeamName,
                    MemberCount = model.MemberCount,
                    ContactPhone = model.ContactPhone,
                    Province = model.Province,
                    District = model.District,
                    Description = model.Description,
                    Latitude = model.Latitude,
                    Longitude = model.Longitude,
                    Status = 2,
                    CreatedAt = DateTime.Now
                };

                _context.RescueTeams.Add(rescueTeam);

                var user = new AppUserModel
                {
                    FullName = model.FullName,
                    UserName = model.UserName,
                    Email = model.Email,
                    PhoneNumber = model.PhoneNumber,
                    Address = model.Address,
                    RescueTeamId = rescueTeam.Id,
                    EmailConfirmed = true,
                    PhoneNumberConfirmed = true
                };

                var result = await _userManager.CreateAsync(user, model.Password);

                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync();

                    return BadRequest(new
                    {
                        message = "Tạo tài khoản thất bại.",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                await _userManager.AddToRoleAsync(user, "RescueTeam");

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Tạo đội cứu hộ và tài khoản thành công."
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return StatusCode(500, new
                {
                    message = "Lỗi hệ thống khi tạo đội cứu hộ.",
                    error = ex.Message
                });
            }
        }


        // GET: api/admin/rescue-teams/request-statistics
        // Thống kê số lượng yêu cầu cứu hộ theo từng đội

        [HttpGet("request-statistics")]
        public async Task<IActionResult> GetRescueTeamRequestStatistics()
        {
            var result = await _context.RescueTeams
                .GroupJoin(
                    _context.RescueRequests,
                    team => team.Id,
                    request => request.RescueTeamId,
                    (team, requests) => new
                    {
                        rescueTeamId = team.Id,
                        teamName = team.TeamName,
                        province = team.Province,
                        district = team.District,
                        status = team.Status,

                        totalRequests = requests.Count(),

                        pendingRequests = requests.Count(r => r.Status == 0),
                        processingRequests = requests.Count(r => r.Status == 1),
                        completedRequests = requests.Count(r => r.Status == 2),
                        canceledRequests = requests.Count(r => r.Status == 3),

                        totalPeopleNeedHelp = requests.Sum(r => r.PeopleCount),

                        urgentRequests = requests.Count(r =>
                            r.UrgencyLevel == "Khẩn cấp" ||
                            r.UrgencyLevel == "Nguy kịch"),

                        hasChildrenRequests = requests.Count(r => r.HasChildren),
                        hasElderlyRequests = requests.Count(r => r.HasElderly),

                        latestRequestAt = requests
                            .OrderByDescending(r => r.CreatedAt)
                            .Select(r => (DateTime?)r.CreatedAt)
                            .FirstOrDefault(),

                        averageResponseMinutes = requests
                            .Where(r => r.PickedUpAt != null)
                            .Select(r =>
                                EF.Functions.DateDiffMinute(
                                    r.CreatedAt,
                                    r.PickedUpAt.Value
                                )
                            )
                            .DefaultIfEmpty()
                            .Average()
                    }
                )
                .OrderByDescending(x => x.totalRequests)
                .ToListAsync();

            return Ok(result);
        }



        [HttpPost("create-request-for-team")]
        public async Task<IActionResult> CreateRequestForTeam(
    [FromForm] RescueRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrEmpty(request.RescueTeamId))
            {
                return BadRequest(new
                {
                    message = "Vui lòng chọn đội cứu hộ."
                });
            }

            var rescueTeam = await _context.RescueTeams
                .FirstOrDefaultAsync(x => x.Id == request.RescueTeamId);

            if (rescueTeam == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy đội cứu hộ."
                });
            }

            request.Distance = CalculateDistance(
                request.Latitude,
                request.Longitude,
                rescueTeam.Latitude,
                rescueTeam.Longitude
            );

            request.Status = 0;
            request.CreatedAt = DateTime.Now;
            request.PickedUpAt = null;
            request.CompletedAt = null;

            if (request.FileAttachments != null &&
                request.FileAttachments.Count > 0)
            {
                string uploadFolder = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "rescueImages"
                );

                if (!Directory.Exists(uploadFolder))
                {
                    Directory.CreateDirectory(uploadFolder);
                }

                List<string> fileNames = new();

                foreach (var file in request.FileAttachments)
                {
                    string fileName =
                        $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";

                    string filePath =
                        Path.Combine(uploadFolder, fileName);

                    using var stream =
                        new FileStream(filePath, FileMode.Create);

                    await file.CopyToAsync(stream);

                    fileNames.Add(fileName);
                }

                request.MediaPaths = string.Join(",", fileNames);
            }

            _context.RescueRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Admin đã gửi yêu cầu cứu hộ đến đội được chọn.",
                requestId = request.Id,
                rescueTeamId = rescueTeam.Id,
                rescueTeamName = rescueTeam.TeamName,
                distance = request.Distance
            });
        }


       private double CalculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2)
        {
            const double earthRadius = 6371;

            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);

            var a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) *
                Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            var c =
                2 * Math.Atan2(
                    Math.Sqrt(a),
                    Math.Sqrt(1 - a)
                );

            return Math.Round(earthRadius * c, 2);
        }

        private double ToRadians(double angle)
        {
            return angle * Math.PI / 180;
        }





    }
}