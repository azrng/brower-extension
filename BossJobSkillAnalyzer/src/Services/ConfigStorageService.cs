using Microsoft.JSInterop;
using BossJobSkillAnalyzer.Models;

namespace BossJobSkillAnalyzer.Services
{
    public class ConfigStorageService
    {
        private const string StorageKey = "boss_job_analyzer_config";
        private readonly IJSRuntime _jsRuntime;

        public ConfigStorageService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<PluginConfig> LoadConfigAsync()
        {
            try
            {
                var result = await _jsRuntime.InvokeAsync<string>("chrome.storage.local.get", StorageKey);
                if (!string.IsNullOrEmpty(result))
                {
                    return System.Text.Json.JsonSerializer.Deserialize<PluginConfig>(result)
                        ?? new PluginConfig();
                }
            }
            catch
            {
                // 如果加载失败，返回默认配置
            }

            return new PluginConfig();
        }

        public async Task SaveConfigAsync(PluginConfig config)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(config);
            var storage = new Dictionary<string, object>
            {
                [StorageKey] = json
            };
            await _jsRuntime.InvokeVoidAsync("chrome.storage.local.set", storage);
        }
    }
}
