using DC3MS.Server.Models;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DC3MS.Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class RescueChatController : ControllerBase
    {
        private readonly AppDbContext _dataContext;
        private readonly UserManager<AppUserModel> _userManager;

        public RescueChatController(
            AppDbContext dataContext,
            UserManager<AppUserModel> userManager
        )
        {
            _dataContext = dataContext;
            _userManager = userManager;
        }

        // GET: api/RescueChat/history?phoneNumber=090xxxxxxx&teamId=TEAM-HCM-Q1
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
            [FromQuery] string phoneNumber,
            [FromQuery] string teamId
        )
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                return BadRequest("Thiếu số điện thoại người dân.");
            }

            if (string.IsNullOrWhiteSpace(teamId))
            {
                return BadRequest("Thiếu mã đội cứu hộ.");
            }

            var normalizedPhone =
                phoneNumber.Trim();

            var user =
                await _userManager.Users
                    .FirstOrDefaultAsync(x =>
                        x.PhoneNumber == normalizedPhone
                    );

            if (user == null)
            {
                return NotFound("Không tìm thấy user theo số điện thoại.");
            }

            var messages =
                await _dataContext.RescueChatMessages
                    .Where(x =>
                        x.UserId == user.Id &&
                        x.TeamId == teamId
                    )
                    .OrderBy(x => x.SentAt)
                    .Select(x => new
                    {
                        id = x.Id,
                        userId = x.UserId,
                        teamId = x.TeamId,
                        senderType = x.SenderType,
                        senderName = x.SenderName,
                        message = x.Message,
                        sentAt = x.SentAt
                    })
                    .ToListAsync();

            return Ok(messages);
        }
    }
}