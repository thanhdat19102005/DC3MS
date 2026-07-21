namespace DC3MS.Server.Config
{
    public class RssOptions
    {
        // Tên phải khớp chính xác với key trong JSON
        public string NewsUrl { get; set; } = string.Empty;
        public int MaxItems { get; set; } = 10;
    }
}
