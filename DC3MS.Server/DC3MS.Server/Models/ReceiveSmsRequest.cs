namespace DC3MS.Server.Models
{
    public class ReceiveSmsRequest
    {
        public string PhoneNumber { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

    }
}
