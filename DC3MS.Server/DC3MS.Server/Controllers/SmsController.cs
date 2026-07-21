using DC3MS.Server.Models;
using DC3MS.Server.Models.Admin;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DC3MS.Server.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class SmsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<AppUserModel> _userManage;

        public SmsController(
            AppDbContext context,
            UserManager<AppUserModel> userManage)
        {
            _context = context;
            _userManage = userManage;
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost("send")]
        public async Task<IActionResult> SendSms(
            [FromBody] SendSmsRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.PhoneTo))
            {
                return BadRequest(new { message = "Vui lòng nhập số điện thoại." });
            }

            if (string.IsNullOrWhiteSpace(model.Content))
            {
                return BadRequest(new { message = "Vui lòng nhập nội dung SMS." });
            }

            try
            {
                string apiToken = "fKGzEzcCd-CxfK0e8qi1TDgb9uMW90yl".Trim();

                var requestBody = new
                {
                    to = new[] { model.PhoneTo },
                    content = model.Content,
                    sms_type = 3,
                    sender = "de849bcec07be377"
                };

                var jsonContent = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json"
                );

                using var client = new HttpClient();

                var authString = Convert.ToBase64String(
                    Encoding.ASCII.GetBytes($"{apiToken}:x")
                );

                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue(
                        "Basic",
                        authString
                    );

                var response = await client.PostAsync(
                    "https://api.speedsms.vn/index.php/sms/send",
                    jsonContent
                );

                var resultString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Gửi SMS thành công.",
                        data = resultString
                    });
                }

                return BadRequest(new
                {
                    success = false,
                    message = "Gửi SMS thất bại.",
                    error = resultString
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống khi gửi SMS.",
                    error = ex.Message
                });
            }
        }
        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost("send-all-citizens")]
        public async Task<IActionResult> SendSmsToAllCitizens(
            [FromBody] SendSmsRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Content))
            {
                return BadRequest(new { message = "Vui lòng nhập nội dung SMS." });
            }

            var citizenPhones = await (
                from user in _userManage.Users
                join userRole in _context.UserRoles
                    on user.Id equals userRole.UserId
                join role in _context.Roles
                    on userRole.RoleId equals role.Id
                where role.Name == "Citizen"
                      && user.PhoneNumber != null
                      && user.PhoneNumber != ""
                select user.PhoneNumber
            )
            .Distinct()
            .ToListAsync();

            if (citizenPhones.Count == 0)
            {
                return BadRequest(new
                {
                    message = "Không tìm thấy số điện thoại của người dân."
                });
            }

            try
            {
                string apiToken = "fKGzEzcCd-CxfK0e8qi1TDgb9uMW90yl".Trim();

                var requestBody = new
                {
                    to = citizenPhones,
                    content = model.Content,
                    sms_type = 3,
                    sender = "de849bcec07be377"
                };

                var jsonContent = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json"
                );

                using var client = new HttpClient();

                var authString = Convert.ToBase64String(
                    Encoding.ASCII.GetBytes($"{apiToken}:x")
                );

                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue(
                        "Basic",
                        authString
                    );

                var response = await client.PostAsync(
                    "https://api.speedsms.vn/index.php/sms/send",
                    jsonContent
                );

                var resultString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Đã gửi SMS cho toàn bộ người dân.",
                        total = citizenPhones.Count,
                        data = resultString
                    });
                }

                return BadRequest(new
                {
                    success = false,
                    message = "Gửi SMS toàn bộ người dân thất bại.",
                    total = citizenPhones.Count,
                    error = resultString
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi hệ thống khi gửi SMS toàn bộ.",
                    error = ex.Message
                });
            }
        }
        [AllowAnonymous]
        [HttpPost("receive")]
        public async Task<IActionResult> ReceiveSms(
      [FromBody] ReceiveSmsRequest model)
        {
            Console.WriteLine("===== RECEIVE API CALLED =====");
            Console.WriteLine($"Raw phone: {model.PhoneNumber}");
            Console.WriteLine($"Raw content: {model.Content}");

            string phone = model.PhoneNumber?.Trim() ?? "";
            string content = model.Content?.Trim() ?? "";

            // Xóa ký tự | bị MacroDroid chèn vào nội dung
            content = content.Replace("|", "").Trim();

            // Chỉ giữ lại số và dấu +
            phone = Regex.Replace(phone, @"[^\d+]", "");

            if (phone.StartsWith("+84"))
            {
                phone = "0" + phone.Substring(3);
            }

            var vietnamPhoneRegex = new Regex(@"^(03|05|07|08|09)\d{8}$");

            if (!vietnamPhoneRegex.IsMatch(phone))
            {
                Console.WriteLine($"Số điện thoại không hợp lệ: {phone}");
                return Ok();
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                Console.WriteLine("Nội dung rỗng.");
                return Ok();
            }

            var receivedSms = new ReceivedSms
            {
                PhoneNumber = phone,
                Content = content,
                ReceivedAt = DateTime.Now,
                IsRead = false
            };

            _context.ReceivedSmsMessages.Add(receivedSms);
            await _context.SaveChangesAsync();

            Console.WriteLine("Đã lưu vào ReceivedSmsMessages.");

            return Ok(new
            {
                success = true,
                message = "Đã nhận SMS từ người dân.",
                data = receivedSms
            });
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpGet("received")]
        public IActionResult GetReceivedSms()
        {
            var data = _context.ReceivedSmsMessages
                .OrderByDescending(x => x.ReceivedAt)
                .Select(x => new
                {
                    id = x.Id,
                    phone = x.PhoneNumber,
                    content = x.Content,
                    isRead = x.IsRead,
                    time = x.ReceivedAt.ToString("dd/MM/yyyy HH:mm:ss")
                })
                .ToList();

            return Ok(data);
        }





        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpDelete("received/{id}")]
        public async Task<IActionResult> DeleteReceivedSms(int id)
        {
            var sms = await _context.ReceivedSmsMessages
                .FirstOrDefaultAsync(x => x.Id == id);

            if (sms == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Không tìm thấy tin nhắn."
                });
            }

            _context.ReceivedSmsMessages.Remove(sms);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Xóa tin nhắn thành công."
            });
        }








    }
}