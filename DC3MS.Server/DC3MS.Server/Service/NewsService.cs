using DC3MS.Server.Config;
using DC3MS.Server.Models;
using Microsoft.Extensions.Options;
using System.ServiceModel.Syndication;
using System.Xml;

namespace DC3MS.Server.Service
{
    public class NewsService
    {
        private readonly RssOptions _options;

        // Constructor nhận cấu hình từ Dependency Injection
        public NewsService(IOptions<RssOptions> options)
        {
            _options = options.Value;
        }

        public List<NewsItem> GetLatestNews()
        {
            string url = _options.NewsUrl;
            int limit = _options.MaxItems;

            List<NewsItem> danhSachTin = new List<NewsItem>();

            using (XmlReader reader = XmlReader.Create(url))
            {
                SyndicationFeed feed = SyndicationFeed.Load(reader);

                foreach (SyndicationItem item in feed.Items)
                {
                    danhSachTin.Add(new NewsItem
                    {
                        Title = item.Title?.Text ?? "Không có tiêu đề",
                        Summary = item.Summary?.Text ?? "Không có mô tả",
                        Link = item.Links.Count > 0 ? item.Links[0].Uri.ToString() : "",
                        PublishedDate = item.PublishDate.DateTime
                    });

                    if (danhSachTin.Count >= limit) break;
                }
            }
            return danhSachTin;
        }
    }
}