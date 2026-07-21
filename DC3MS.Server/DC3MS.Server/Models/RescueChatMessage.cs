using System.ComponentModel.DataAnnotations;

namespace DC3MS.Server.Models
{
    public class RescueChatMessage
    {
        [Key]
        public long Id { get; set; }

        public string UserId { get; set; } = "";

        public string TeamId { get; set; } = "";

        public string SenderType { get; set; } = "";
        // user | team

        public string SenderName { get; set; } = "";

        public string Message { get; set; } = "";

        public DateTime SentAt { get; set; }
            = DateTime.Now;
    }
}