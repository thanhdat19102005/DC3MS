using DC3MS.Server.Models;
using DC3MS.Server.Models.Admin;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DC3MS.Server.Controllers
{
    [Route("api/admin/accounts")]
    [ApiController]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class AdminAccountController : ControllerBase
    {


        private readonly UserManager<AppUserModel> _userManager;
        private readonly AppDbContext _context;

        public AdminAccountController(
            UserManager<AppUserModel> userManager,
            AppDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }


        [HttpPost]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> CreateAdminAccount(
            [FromBody] CreateAdminAccountDto model)
        {
            var exists =
                await _userManager.FindByNameAsync(
                    model.UserName);

            if (exists != null)
            {
                return BadRequest(new
                {
                    message = "Username đã tồn tại."
                });
            }

            var user = new AppUserModel
            {
                FullName = model.FullName,
                UserName = model.UserName,
                Email = model.Email,
                PhoneNumber = model.PhoneNumber,
                Address = model.Address,
                EmailConfirmed = true,
                PhoneNumberConfirmed = true
            };

            var result =
                await _userManager.CreateAsync(
                    user,
                    model.Password);

            if (!result.Succeeded)
            {
                var errors = result.Errors
                    .Select(e => TranslateIdentityError(e.Code, e.Description))
                    .ToList();

                return BadRequest(new
                {
                    message = string.Join(" | ", errors)
                });
            }

            await _userManager.AddToRoleAsync(
                user,
                model.RoleName);

            return Ok(new
            {
                message = "Tạo quản trị viên thành công."
            });
        }


        private string TranslateIdentityError(
    string code,
    string description)
        {
            return code switch
            {
                "InvalidUserName" =>
                    "Tên đăng nhập không hợp lệ. Chỉ được dùng chữ không dấu, số, dấu chấm, gạch dưới hoặc @.",

                "DuplicateUserName" =>
                    "Tên đăng nhập đã tồn tại.",

                "DuplicateEmail" =>
                    "Email đã tồn tại.",

                "InvalidEmail" =>
                    "Email không hợp lệ.",

                "PasswordTooShort" =>
                    "Mật khẩu quá ngắn.",

                "PasswordRequiresNonAlphanumeric" =>
                    "Mật khẩu phải có ít nhất 1 ký tự đặc biệt, ví dụ @ hoặc #.",

                "PasswordRequiresDigit" =>
                    "Mật khẩu phải có ít nhất 1 chữ số.",

                "PasswordRequiresLower" =>
                    "Mật khẩu phải có ít nhất 1 chữ thường.",

                "PasswordRequiresUpper" =>
                    "Mật khẩu phải có ít nhất 1 chữ hoa.",

                _ => description
            };
        }





        // GET: api/admin/rescue-teams/admin-accounts
        [HttpGet("admin-accounts")]
        public async Task<IActionResult> GetAdminAccounts()
        {
            var users =
                await (
                    from user in _context.Users

                    join userRole in _context.UserRoles
                        on user.Id equals userRole.UserId

                    join role in _context.Roles
                        on userRole.RoleId equals role.Id

                    where role.Name == "Admin"
                          || role.Name == "SuperAdmin"

                    select new
                    {
                        id = user.Id,
                        fullName = user.FullName,
                        userName = user.UserName,
                        email = user.Email,
                        phoneNumber = user.PhoneNumber,
                        address = user.Address,
                        avatarUrl = user.AvatarUrl,

                        roleId = role.Id,
                        roleName = role.Name
                    }
                )
                .ToListAsync();

            return Ok(users);
        }



        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> UpdateAdminAccount(
       string id,
       [FromBody] UpdateAdminAccountDto model)
        {
            var currentEmail =
                User.FindFirstValue(ClaimTypes.Email);

            var currentUser =
                await _userManager.Users
                    .FirstOrDefaultAsync(x =>
                        x.Email == currentEmail);

            if (currentUser == null)
            {
                return Unauthorized(new
                {
                    message = "Không xác định được người dùng."
                });
            }

            var user =
                await _userManager.FindByIdAsync(id);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản."
                });
            }

            // Không cho sửa chính mình
            if (user.Id == currentUser.Id)
            {
                return BadRequest(new
                {
                    message = "Bạn không thể tự chỉnh sửa tài khoản của chính mình."
                });
            }

            var targetRoles =
                await _userManager.GetRolesAsync(user);

            // Không cho sửa SuperAdmin khác
            if (targetRoles.Contains("SuperAdmin"))
            {
                return BadRequest(new
                {
                    message = "Bạn không thể chỉnh sửa tài khoản SuperAdmin."
                });
            }

            user.FullName = model.FullName;
            user.UserName = model.UserName;
            user.NormalizedUserName =
                model.UserName?.ToUpper();

            user.Email = model.Email;
            user.NormalizedEmail =
                model.Email?.ToUpper();

            user.PhoneNumber = model.PhoneNumber;
            user.Address = model.Address;

            var result =
                await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = string.Join(
                        " | ",
                        result.Errors.Select(x => x.Description))
                });
            }

            // Đổi mật khẩu nếu nhập
            if (!string.IsNullOrWhiteSpace(model.Password))
            {
                var token =
                    await _userManager.GeneratePasswordResetTokenAsync(user);

                var resetPasswordResult =
                    await _userManager.ResetPasswordAsync(
                        user,
                        token,
                        model.Password);

                if (!resetPasswordResult.Succeeded)
                {
                    return BadRequest(new
                    {
                        message = string.Join(
                            " | ",
                            resetPasswordResult.Errors
                                .Select(x => x.Description))
                    });
                }
            }

            return Ok(new
            {
                message = "Cập nhật tài khoản thành công."
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeleteAdminAccount(
    string id)
        {
            var currentEmail =
                User.FindFirstValue(ClaimTypes.Email);

            var currentUser =
                await _userManager.Users
                    .FirstOrDefaultAsync(x =>
                        x.Email == currentEmail);

            if (currentUser == null)
            {
                return Unauthorized(new
                {
                    message = "Không xác định được người dùng."
                });
            }

            var user =
                await _userManager.FindByIdAsync(id);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản."
                });
            }

            // Không được xóa chính mình
            if (user.Id == currentUser.Id)
            {
                return BadRequest(new
                {
                    message = "Bạn không thể tự xóa tài khoản của chính mình."
                });
            }

            var targetRoles =
                await _userManager.GetRolesAsync(user);

            // Không được xóa SuperAdmin khác
            if (targetRoles.Contains("SuperAdmin"))
            {
                return BadRequest(new
                {
                    message = "Bạn không thể xóa tài khoản SuperAdmin."
                });
            }

            var result =
                await _userManager.DeleteAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = string.Join(
                        " | ",
                        result.Errors.Select(x => x.Description))
                });
            }

            return Ok(new
            {
                message = "Xóa tài khoản thành công."
            });
        }




    }
}
