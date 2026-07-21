using DC3MS.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DC3MS.Server.Hubs
{
    [Authorize]
    public class VideoCallHub : Hub
    {
        private readonly UserManager<AppUserModel> _userManager;

        public VideoCallHub(
            UserManager<AppUserModel> userManager
        )
        {
            _userManager = userManager;
        }

        private string BuildRoomId(
            string userId,
            string teamId
        )
        {
            return $"video_{userId}_{teamId}";
        }

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

            return await _userManager.Users
                .FirstOrDefaultAsync(x =>
                    x.PhoneNumber == normalizedPhone);
        }

        public async Task<string> JoinVideoRoomForTeam(
            string phoneNumber,
            string teamId
        )
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                throw new HubException(
                    "Không xác định được số điện thoại người dân.");
            }

            if (string.IsNullOrWhiteSpace(teamId))
            {
                throw new HubException(
                    "Không xác định được TeamId.");
            }

            var user =
                await GetUserByPhoneNumber(phoneNumber);

            if (user == null)
            {
                throw new HubException(
                    "Không tìm thấy user theo số điện thoại.");
            }

            var roomId =
                BuildRoomId(
                    user.Id,
                    teamId);

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                roomId);

            Console.WriteLine($"TEAM JOIN VIDEO ROOM: {roomId}");

            return roomId;
        }

        public async Task<string> JoinVideoRoomForUser(
            string userId,
            string teamId
        )
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new HubException(
                    "Không xác định được UserId.");
            }

            if (string.IsNullOrWhiteSpace(teamId))
            {
                throw new HubException(
                    "Không xác định được TeamId.");
            }

            var roomId =
                BuildRoomId(
                    userId,
                    teamId);

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                roomId);

            Console.WriteLine($"USER JOIN VIDEO ROOM: {roomId}");

            return roomId;
        }

        public async Task SendVideoOffer(
            string roomId,
            string offer
        )
        {
            await Clients.OthersInGroup(roomId)
                .SendAsync("ReceiveVideoOffer", offer);
        }

        public async Task SendVideoAnswer(
            string roomId,
            string answer
        )
        {
            await Clients.OthersInGroup(roomId)
                .SendAsync("ReceiveVideoAnswer", answer);
        }

        public async Task SendIceCandidate(
            string roomId,
            string candidate
        )
        {
            await Clients.OthersInGroup(roomId)
                .SendAsync("ReceiveIceCandidate", candidate);
        }

        public async Task EndVideoCall(
            string roomId
        )
        {
            await Clients.OthersInGroup(roomId)
                .SendAsync("VideoCallEnded");
        }
    }
}