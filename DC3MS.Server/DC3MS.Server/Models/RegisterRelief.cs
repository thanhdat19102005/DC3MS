using System.ComponentModel.DataAnnotations;

namespace DC3MS.Server.Models
{
    public class RegisterRelief
    {
        [Required(ErrorMessage = "Số điện thoại không được để trống.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Địa chỉ không được để trống.")]
        public string Address { get; set; } = string.Empty;

    }
}
