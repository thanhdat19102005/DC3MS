using DC3MS.Server.Service;
using Microsoft.AspNetCore.Mvc;

namespace DC3MS.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NewsController : ControllerBase
    {
        // 1. Khai báo biến để lưu service
        private readonly NewsService _newsService;

        // 2. Constructor để nhận Service thông qua Dependency Injection
        public NewsController(NewsService newsService)
        {
            _newsService = newsService;
        }

        // 3. Sử dụng service đã tiêm vào
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var news = _newsService.GetLatestNews();
                return Ok(news);
            }
            catch (Exception ex)
            {
                // Trả về lỗi nếu không lấy được tin (ví dụ: mất kết nối internet)
                return StatusCode(500, $"Lỗi khi lấy tin tức: {ex.Message}");
            }
        }
    }
}