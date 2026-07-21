using DC3MS.Server.Config;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;

namespace DC3MS.Server.Service
{
    public class GeminiService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly IOptions<Gemini> _options;
        public GeminiService(HttpClient http, IConfiguration config, IOptions<Gemini> options)
        {
            _http = http;
            _config = config;
            _options = options;
        }

        public async Task<string> AskAsync(string message)
        {
            // 1. Lấy API Key từ cấu hình (Đảm bảo dùng mã từ Gmail cá nhân hoặc Project mới)
            var apiKey = _options.Value.ApiKey;
            if (string.IsNullOrEmpty(apiKey))
            {
                return "Lỗi: Chưa cấu hình API Key trong appsettings.json";
            }

            // 2. URL mới: Sử dụng model gemini-3.1-flash-lite (Dựa trên danh sách ListModels bạn vừa quét được)
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={apiKey}";

            // 3. Chuẩn bị Request Body (Giữ nguyên cấu trúc chuẩn) format do gemini yêu cầu
            var body = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = message }
                        }
                    }
                }
            };


            try
            {
                var json = JsonSerializer.Serialize(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // 4. Gửi Request bằng phương thức POST
                var response = await _http.PostAsync(url, content);
                var result = await response.Content.ReadAsStringAsync();

                // In log ra cửa sổ Output để theo dõi
                Console.WriteLine($"API Response: {result}");

                // 5. Kiểm tra mã trạng thái HTTP
                if (!response.IsSuccessStatusCode)
                {
                    return $"Lỗi API ({response.StatusCode}): {result}";
                }

                // dùng Nó biến chuỗi JSON (string) thành Một cây dữ liệu JSON dạng object  
                using var doc = JsonDocument.Parse(result);
                var root = doc.RootElement;

                // Truy xuất dữ liệu theo cấu trúc: candidates -> content -> parts -> text
                if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];
                    if (firstCandidate.TryGetProperty("content", out var resContent) &&
                        resContent.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0)
                    {
                        return parts[0].GetProperty("text").GetString() ?? "Không có văn bản trả về.";
                    }
                }

                return "API trả về thành công nhưng cấu trúc dữ liệu không như mong đợi.";
            }
            catch (Exception ex)
            {
                // Xử lý lỗi kết nối hoặc phân tích JSON
                return $"Lỗi hệ thống: {ex.Message}";
            }
        }
    }

}
