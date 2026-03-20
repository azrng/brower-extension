namespace BossJobSkillAnalyzer.Models
{
    public class PluginConfig
    {
        public string ApiBaseUrl { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int MaxPages { get; set; } = 3;
        public int RequestTimeout { get; set; } = 30; // 秒
        public int ProcessInterval { get; set; } = 2000; // 毫秒

        public bool IsValid()
        {
            return !string.IsNullOrWhiteSpace(ApiBaseUrl)
                && !string.IsNullOrWhiteSpace(ApiKey)
                && !string.IsNullOrWhiteSpace(Model)
                && MaxPages >= 1
                && RequestTimeout > 0
                && ProcessInterval >= 0;
        }
    }
}