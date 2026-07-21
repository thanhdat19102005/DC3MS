using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DC3MS.Server.Models
{
    public class SmsHistory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string PhoneNumber { get; set; }

        [Required]
        public string Content { get; set; }

        public string ReceiverMode { get; set; } = "single";

        public string Status { get; set; } = "sending";

        public string? ResponseMessage { get; set; }

        public DateTime SentAt { get; set; } = DateTime.Now;
    }
}
