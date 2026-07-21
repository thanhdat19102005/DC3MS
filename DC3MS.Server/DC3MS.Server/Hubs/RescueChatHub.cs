using DC3MS.Server.Models;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DC3MS.Server.Hubs
{
    [Authorize]
    public class RescueChatHub : Hub 
    {
        private readonly AppDbContext _dataContext;
        private readonly UserManager<AppUserModel> _userManager;

        public RescueChatHub(
            AppDbContext dataContext,
            UserManager<AppUserModel> userManager
        )
        {
            _dataContext = dataContext;
            _userManager = userManager;
        }

        // ====================================
        // LẤY USER ID THẬT TRONG DATABASE
        // DÙNG CHO PHÍA NGƯỜI DÂN
        // ====================================
        private async Task<AppUserModel?> GetCurrentUserFromDatabase()
        {
            var email =
                Context.User?
                .FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrEmpty(email))
            {
                return null;
            }

            var user =
                await _userManager.FindByEmailAsync(email);

            return user;
        }

        // ====================================
        // TÌM USER NGƯỜI DÂN BẰNG SỐ ĐIỆN THOẠI
        // DÙNG CHO PHÍA ĐỘI CỨU HỘ
        // ====================================
        private async Task<AppUserModel?> GetUserByPhoneNumber(
            string phoneNumber
        )
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                return null;
            }

            var normalizedPhone =
                phoneNumber.Trim();

            var user =
                await _userManager.Users
                    .FirstOrDefaultAsync(u =>
                        u.PhoneNumber == normalizedPhone
                    );

            return user;
        }

        // ====================================
        // TẠO ROOM ID
        // room = chat_userDbId_teamId
        // ====================================
        private string BuildRoomId(
            string userDbId,
            string teamId
        )
        {
            return $"chat_{userDbId}_{teamId}";
        }

        // ====================================
        // JOIN ROOM - PHÍA NGƯỜI DÂN
        // Angular chỉ truyền teamId
        // Server tự lấy Email -> User DB -> User.Id
        // ====================================
        public async Task JoinRescueRoom(
            string teamId
        )
        {
            if (string.IsNullOrWhiteSpace(teamId))
            {
                throw new HubException(
                    "Không xác định được mã đội cứu hộ."
                );
            }

            var user =
                await GetCurrentUserFromDatabase();

            if (user == null)
            {
                throw new HubException(
                    "Không tìm thấy tài khoản người dùng trong Database."
                );
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId
                );

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                roomId
            );

            await Clients.Group(roomId)
                .SendAsync(
                    "UserJoined",
                    new
                    {
                        roomId,
                        userId = user.Id,
                        email = user.Email,
                        teamId,
                        connectionId = Context.ConnectionId
                    }
                );
        }

        // ====================================
        // LEAVE ROOM - PHÍA NGƯỜI DÂN
        // ====================================
        public async Task LeaveRescueRoom(
            string teamId
        )
        {
            if (string.IsNullOrWhiteSpace(teamId))
            {
                return;
            }

            var user =
                await GetCurrentUserFromDatabase();

            if (user == null)
            {
                return;
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId
                );

            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                roomId
            );
        }

        // ====================================
        // SEND MESSAGE - PHÍA NGƯỜI DÂN
        // Có lưu lịch sử vào DB
        // ====================================
        public async Task SendRescueMessage(
            string teamId,
            string senderType,
            string senderName,
            string message
        )
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(teamId))
            {
                throw new HubException(
                    "Không xác định được mã đội cứu hộ."
                );
            }

            var user =
                await GetCurrentUserFromDatabase();

            if (user == null)
            {
                throw new HubException(
                    "Không tìm thấy tài khoản người dùng trong Database."
                );
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId
                );

            var sentAt =
                DateTime.Now;

            // ====================================
            // LƯU TIN NHẮN VÀO DATABASE
            // ====================================
            var chatMessage =
                new RescueChatMessage
                {
                    UserId = user.Id,
                    TeamId = teamId,
                    SenderType = senderType,
                    SenderName = senderName,
                    Message = message,
                    SentAt = sentAt
                };

            _dataContext.RescueChatMessages.Add(chatMessage);

            await _dataContext.SaveChangesAsync();

            // ====================================
            // GỬI REALTIME CHO CÁC CLIENT TRONG ROOM
            // ====================================
            await Clients.Group(roomId)
                .SendAsync(
                    "ReceiveRescueMessage",
                    new
                    {
                        id = chatMessage.Id,
                        roomId,
                        userId = user.Id,
                        email = user.Email,
                        teamId,
                        senderType,
                        senderName,
                        message,
                        sentAt
                    }
                );
        }

        // ====================================
        // JOIN ROOM - PHÍA ĐỘI CỨU HỘ
        // Đội cứu hộ truyền phoneNumber + teamId
        // Server tìm AspNetUsers bằng PhoneNumber
        // ====================================
        public async Task JoinRescueRoomForTeam(
            string phoneNumber,
            string teamId
        )
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                throw new HubException(
                    "Không xác định được số điện thoại người dân."
                );
            }

            if (string.IsNullOrWhiteSpace(teamId))
            {
                throw new HubException(
                    "Không xác định được mã đội cứu hộ."
                );
            }

            var user =
                await GetUserByPhoneNumber(phoneNumber);

            if (user == null)
            {
                throw new HubException(
                    "Không tìm thấy user theo số điện thoại."
                );
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId
                );

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                roomId
            );

            await Clients.Group(roomId)
                .SendAsync(
                    "UserJoined",
                    new
                    {
                        roomId,
                        userId = user.Id,
                        phoneNumber,
                        teamId,
                        connectionId = Context.ConnectionId
                    }
                );
        }

        // ====================================
        // LEAVE ROOM - PHÍA ĐỘI CỨU HỘ
        // ====================================
        public async Task LeaveRescueRoomForTeam(
            string phoneNumber,
            string teamId
        )
        {
            if (
                string.IsNullOrWhiteSpace(phoneNumber) ||
                string.IsNullOrWhiteSpace(teamId)
            )
            {
                return;
            }

            var user =
                await GetUserByPhoneNumber(phoneNumber);

            if (user == null)
            {
                return;
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId
                );

            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                roomId
            );
        }

        // ====================================
        // SEND MESSAGE - PHÍA ĐỘI CỨU HỘ
        // Có lưu lịch sử vào DB
        // ====================================
        public async Task SendRescueMessageForTeam(
            string phoneNumber,
            string teamId,
            string senderName,
            string message
        )
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                throw new HubException(
                    "Không xác định được số điện thoại người dân."
                );
            }

            if (string.IsNullOrWhiteSpace(teamId))
            {
                throw new HubException(
                    "Không xác định được mã đội cứu hộ."
                );
            }

            var user =
                await GetUserByPhoneNumber(phoneNumber);

            if (user == null)
            {
                throw new HubException(
                    "Không tìm thấy user theo số điện thoại."
                );
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId
                );

            var sentAt =
                DateTime.Now;

            // ====================================
            // LƯU TIN NHẮN VÀO DATABASE
            // ====================================
            var chatMessage =
                new RescueChatMessage
                {
                    UserId = user.Id,
                    TeamId = teamId,
                    SenderType = "team",
                    SenderName = senderName,
                    Message = message,
                    SentAt = sentAt
                };

            _dataContext.RescueChatMessages.Add(chatMessage);

            await _dataContext.SaveChangesAsync();

            // ====================================
            // GỬI REALTIME CHO CÁC CLIENT TRONG ROOM
            // ====================================
            await Clients.Group(roomId)
                .SendAsync(
                    "ReceiveRescueMessage",
                    new
                    {
                        id = chatMessage.Id,
                        roomId,
                        userId = user.Id,
                        phoneNumber,
                        teamId,
                        senderType = "team",
                        senderName,
                        message,
                        sentAt
                    }
                );
        }








    }
}