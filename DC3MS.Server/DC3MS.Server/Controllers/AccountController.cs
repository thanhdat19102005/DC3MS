using DC3MS.Server.Models;
using DC3MS.Server.Models.Auth;
using DC3MS.Server.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DC3MS.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AccountController : ControllerBase
    {
        private UserManager<AppUserModel> _userManage;
        private readonly SignInManager<AppUserModel> _signInManage;
        private readonly IConfiguration _config;

        private readonly AppDbContext _dataContext;

        public AccountController(UserManager<AppUserModel> userManage, SignInManager<AppUserModel> signInManage , IConfiguration config, AppDbContext dataContext)
        {
              this._userManage = userManage;
              this._signInManage = signInManage;
              this._config = config;
              this._dataContext = dataContext;
        }







        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterViewModel model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // 1. Kiểm tra số điện thoại đã tồn tại chưa
            // Vì bạn dùng SĐT làm UserName, ta có thể dùng FindByNameAsync hoặc dùng LINQ qua Users
            var existingUser = await _userManage.Users
                .AnyAsync(u => u.PhoneNumber == model.PhoneNumber);

            if (existingUser)
            {
                return BadRequest(new { message = "Số điện thoại này đã được đăng ký bởi tài khoản khác." });
            }

            // 2. Nếu chưa trùng, tiến hành tạo User
            var user = new AppUserModel
            {
                UserName = model.Email.Split('@')[0],  // sử dụng phần trước của email làm UserName 
                Email = model.Email,
                PhoneNumber = model.PhoneNumber,
                FullName = model.FullName,
                Address = model.Address,
                PasswordHash = model.Password // Lưu ý: PasswordHash sẽ được Identity tự động hash khi gọi CreateAsync, bạn không cần hash thủ công
            };

            var result = await _userManage.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _userManage.AddToRoleAsync(user, "CITIZEN"); // Gán role "CITIZEN" cho user mới
                return Ok(new { message = "Đăng ký thành công" });
            }

            return BadRequest(result.Errors);
        }




        [HttpPost("registerRelief")]
        public async Task<IActionResult> RegisterRelief([FromBody] RegisterRelief model)
        {
            var loggedInUserEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(loggedInUserEmail))
            {
                return Unauthorized(new { message = "Không tìm thấy thông tin email trong phiên đăng nhập." });
            }

            // 2. Gọi Identity tìm bản ghi User dưới Database bằng Email
            var currentUser = await _userManage.FindByEmailAsync(loggedInUserEmail);
            if (currentUser == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng với email đã đăng nhập." });
            }   
            currentUser.Address = model.Address; // Cập nhật địa chỉ mới
            currentUser.PhoneNumber = model.PhoneNumber; // Cập nhật số điện thoại mới

            await _userManage.UpdateAsync(currentUser); // Lưu thay đổi vào database
            await _dataContext.SaveChangesAsync(); // Đảm bảo thay đổi được lưu vào database


            return Ok(new { message = "Thông tin người đăng nhập", email = loggedInUserEmail, userId = currentUser?.Id });
        }




        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginViewModel model, [FromQuery] string requestedRole)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 1. Tìm user
            var user = await _userManage.Users.FirstOrDefaultAsync(x => x.PhoneNumber == model.PhoneNumber);
            if (user == null)
                return Unauthorized(new { message = "Số điện thoại không tồn tại." });

            // 2. Check mật khẩu
            var result = await _signInManage.CheckPasswordSignInAsync(user, model.Password, false);
            if (!result.Succeeded)
                return Unauthorized(new { message = "Mật khẩu không chính xác." });

            // 3. Lấy roles từ DB
            var roles = await _userManage.GetRolesAsync(user);
            var lowerRoles = roles.Select(r => r.ToLower()).ToList();

            // 4. Kiểm tra quyền (phải khớp với tên trong DB: Citizen, RescueTeam, Admin/SuperAdmin)
            bool isAuthorized = (requestedRole == "user" && lowerRoles.Contains("citizen")) ||
                                (requestedRole == "team" && lowerRoles.Contains("rescueteam")) ||
                                (requestedRole == "admin" && (lowerRoles.Contains("admin") || lowerRoles.Contains("superadmin")));

            if (!isAuthorized)
            {
                return Unauthorized(new
                {
                    message = "Tài khoản của bạn không được cấp quyền cho vai trò này.",
                    
                });
            }

            // 4. Create claims (UserName + Email + Role)
            var claims = new List<Claim>
    {
        new Claim(ClaimTypes.Name, user.UserName ?? ""),
        new Claim(ClaimTypes.Email, user.Email ?? "")
    };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            // 5. Create JWT
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            //  gửi cookie về browser
            Response.Cookies.Append(
                "accessToken",
                jwt,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true, // Phải là true
                    SameSite = SameSiteMode.None, // Phải là None
                    Expires = DateTime.UtcNow.AddHours(2),// Cookie sẽ sống 7 ngày thay vì biến mất khi đóng tab
                    Path = "/"
                });

            // 7. RESPONSE
            return Ok(new
            {
                message = "Đăng nhập thành công",
                fullName = user.FullName,
                phoneNumber = user.PhoneNumber,
                roles
            });
        }



        [HttpPost("logout")]
        public IActionResult Logout()
        {
            // Cần xóa với thông số y hệt lúc tạo (Path, Domain, SameSite, Secure)
            Response.Cookies.Append("accessToken", "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = DateTime.UtcNow.AddDays(-1) // Đặt thời gian lùi về quá khứ để nó hết hạn ngay lập tức
            });

            return Ok(new { message = "Logout success" });
        }



        // =========================
        // PROTECTED ROUTES (YÊU CẦU ĐĂNG NHẬP)
        // =========================
        [Authorize]  // kiểm tra xem JWT trong Cookie có hợp lệ không   
        [HttpGet("profile")]
        public IActionResult Profile()
        {
            return Ok(new
            {
                username = User.Identity?.Name,

                email = User.FindFirst(ClaimTypes.Email)?.Value,

                roles = User.Claims
                    .Where(c => c.Type == ClaimTypes.Role)
                    .Select(c => c.Value)
            });
        }



      
         





    }
}
