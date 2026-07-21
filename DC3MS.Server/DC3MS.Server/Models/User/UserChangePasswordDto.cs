namespace DC3MS.Server.Models.User
{
    public class UserChangePasswordDto
    {
        // Mật khẩu hiện tại
        public string CurrentPassword { get; set; }

        // Mật khẩu mới
        public string NewPassword { get; set; }

        // Xác nhận mật khẩu mới
        public string ConfirmPassword { get; set; }


    }
}
