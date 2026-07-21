using DC3MS.Server.Config;
using DC3MS.Server.Models;
using DC3MS.Server.Service;
using Microsoft.AspNetCore.Mvc;

namespace DC3MS.Server.Controllers
{

    [ApiController]
    [Route("[controller]")]

    public class ChatController : ControllerBase
    {

        private readonly GeminiService _gemini;

        public ChatController(GeminiService gemini)
        {
            _gemini = gemini;
        }



        [HttpPost]
        public async Task<IActionResult> Chat(ChatRequest request)
        {
            var result = await _gemini.AskAsync(request.Message);
            return Ok(new { answer = result });
        }


    }


}

