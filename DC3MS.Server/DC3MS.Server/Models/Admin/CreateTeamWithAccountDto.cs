namespace DC3MS.Server.Models.Admin
{
    public class CreateTeamWithAccountDto
    {
        public string RescueTeamId { get; set; }
        public string TeamName { get; set; }
        public int MemberCount { get; set; }
        public string ContactPhone { get; set; }
        public string Province { get; set; }
        public string District { get; set; }
        public string Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public string FullName { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string Password { get; set; }


    }
}
