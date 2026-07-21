using DC3MS.Server.Models;
using DC3MS.Server.Models.Auth.Google;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DC3MS.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GoogleAuthController : ControllerBase
    {
        private UserManager<AppUserModel> _userManage;
        private readonly SignInManager<AppUserModel> _signInManage;
        private readonly IConfiguration _config;



        public GoogleAuthController(UserManager<AppUserModel> userManage, SignInManager<AppUserModel> signInManage, IConfiguration config)
        {
            this._userManage = userManage;
            this._signInManage = signInManage;
            this._config = config;
        }


        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin(
    [FromBody] GoogleLoginDto dto)
        {
            // ================= VERIFY GOOGLE TOKEN =================

            var payload =
                await GoogleJsonWebSignature
                .ValidateAsync(dto.IdToken);  //IdToken là  JWT của google cấp phát nó sẽ chứa các Claim bên trong token  iss , sub , adress email  Jack@gmail.com ,  name của Email  , picture  URL dẫn đến ảnh đại diện Google của họ, exp (Expiration Time) ,...   

            // ================= GET EMAIL =================

            var email = payload.Email;

            // ================= FIND USER =================

            var user =
                await _userManage
                .FindByEmailAsync(email);

            // ================= CREATE USER =================

            if (user == null)
            {
                user = new AppUserModel
                {
                    Email = email, // lấy Email   

                    UserName = email, // lấy email 

                    FullName = payload.Name  // Lấy UserName của Email  
                };

                await _userManage.CreateAsync(user);

                await _userManage
                    .AddToRoleAsync(user, "CITIZEN");
            }

            // ================= GET ROLES =================

            var roles =
                await _userManage.GetRolesAsync(user);

            // ================= CREATE CLAIMS =================

            var claims = new List<Claim>
    {
        new Claim(
            ClaimTypes.Name,
            user.UserName ?? ""
        ),

        new Claim(
            ClaimTypes.Email,
            user.Email ?? ""
        )
    };

            foreach (var role in roles)
            {
                claims.Add(
                    new Claim(
                        ClaimTypes.Role,
                        role
                    )
                );
            }

            // ================= CREATE JWT =================

            var key =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        _config["Jwt:Key"]!
                    )
                );

            var creds =
                new SigningCredentials(
                    key,
                    SecurityAlgorithms.HmacSha256
                );

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],

                audience: _config["Jwt:Audience"],

                claims: claims,

                expires: DateTime.UtcNow.AddHours(2),

                signingCredentials: creds
            );

            var jwt =
                new JwtSecurityTokenHandler()
                .WriteToken(token);

            // ================= SAVE JWT TO COOKIE =================

            //  gửi cookie về browser
            Response.Cookies.Append(
                "accessToken",

                jwt,

                new CookieOptions
                {
                    HttpOnly = true,

                    Secure = true,

                    SameSite = SameSiteMode.None,

                    Expires = DateTime.UtcNow.AddHours(2),

                    Path = "/"
                });

            // ================= RESPONSE =================

            return Ok(new
            {
                message = "Google login success",

                fullName = user.FullName,

                roles
            });
        }




    }
}
