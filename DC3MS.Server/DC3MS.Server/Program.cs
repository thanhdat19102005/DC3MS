using DC3MS.Server.Config;
using DC3MS.Server.Hubs;
using DC3MS.Server.Models;
using DC3MS.Server.Repositories;
using DC3MS.Server.Service;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ================= 1. ADD SERVICES & CONTROLLERS =================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ================= 2. DATABASE =================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnectionString")));

// ================= 3. IDENTITY =================
builder.Services.AddIdentity<AppUserModel, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.User.RequireUniqueEmail = true;
});

// ================= 4. JWT & AUTHENTICATION =================
builder.Services.AddAuthentication(options =>
{
    // Ép hệ thống dùng JWT Bearer làm mặc định
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Đọc Token từ Cookie tên là "accessToken"
            context.Token = context.Request.Cookies["accessToken"];
            return Task.CompletedTask;
        }
    };
});

// Chặn Identity tự động Redirect về trang Login (vì mình dùng API)
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization();

// ================= 5. CORS (Phải khớp Port 4200) =================
builder.Services.AddCors(options =>
{
    options.AddPolicy("MyPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://trillion-immorally-urban.ngrok-free.dev")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Bắt buộc cho Cookie
    });
});

// ================= 6. SWAGGER & OTHERS =================
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "DC3MS API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT Token"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

builder.Services.AddHttpClient<GeminiService>();
builder.Services.Configure<Gemini>(builder.Configuration.GetSection("Gemini"));




// Đặt đoạn này trong Program.cs
builder.Services.Configure<DC3MS.Server.Config.RssOptions>(
    builder.Configuration.GetSection("RssConfig"));


// Đặt đoạn này trong Program.cs
builder.Services.Configure<DC3MS.Server.Config.RescueSettings>(
    builder.Configuration.GetSection("RescueSettings"));


// Đăng ký Service để có thể dùng trong Controller/Service khác
builder.Services.AddScoped<DC3MS.Server.Service.NewsService>();


builder.Services.AddSignalR();






// ================= 7. BUILD APP & MIDDLEWARE PIPELINE =================
var app = builder.Build();


// =========================
// SEED ROLE + SUPERADMIN
// =========================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    await SeedingData.SeedData(services);
}






// THỨ TỰ LÀ RẤT QUAN TRỌNG:
app.UseCors("MyPolicy"); // 1. CORS luôn đứng đầu

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Cho phép phục vụ file tĩnh (ảnh, video...) từ wwwroot
app.UseStaticFiles();
app.UseHttpsRedirection();

app.UseAuthentication(); // 2. Xác thực (Đọc Cookie/Token)
app.UseAuthorization();  // 3. Phân quyền

app.MapControllers();

// Đăng ký Hub cho SignalR
app.MapHub<RescueChatHub>("/rescueChatHub");


app.MapHub<VideoCallHub>("/videoCallHub");
app.Run();