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

        private async Task LogToConsole(string message)
        {
            try
            {
                await _jsRuntime.InvokeVoidAsync("console.log", $"[ConfigStorage] {message}");
            }
            catch { }
        }

        public async Task<PluginConfig> LoadConfigAsync()
        {
            try
            {
                await LogToConsole($"正在加载配置: {StorageKey}");

                // 创建一个辅助函数来调用 chrome.storage.local.get
                var result = await _jsRuntime.InvokeAsync<string>("chromeStorageGet", StorageKey);

                await LogToConsole($"原始数据: {result}");

                if (!string.IsNullOrEmpty(result) && result != "null")
                {
                    var config = System.Text.Json.JsonSerializer.Deserialize<PluginConfig>(result);
                    if (config != null)
                    {
                        await LogToConsole($"配置加载成功 - API Base URL: {config.ApiBaseUrl}");
                        return config;
                    }
                }
            }
            catch (Exception ex)
            {
                await LogToConsole($"加载配置失败: {ex.Message}");
                // 如果加载失败，返回默认配置
            }

            await LogToConsole("返回默认配置");
            return new PluginConfig();
        }

        public async Task SaveConfigAsync(PluginConfig config)
        {
            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions
                {
                    WriteIndented = false
                });

                await LogToConsole($"正在保存配置: {StorageKey}");
                await LogToConsole($"配置内容: {json}");

                // 使用辅助函数保存
                await _jsRuntime.InvokeVoidAsync("chromeStorageSet", StorageKey, json);

                await LogToConsole("配置保存成功");

                // 验证保存是否成功
                var verify = await _jsRuntime.InvokeAsync<string>("chromeStorageGet", StorageKey);
                await LogToConsole($"验证结果: {verify}");
            }
            catch (Exception ex)
            {
                await LogToConsole($"保存配置失败: {ex.Message}");
                throw;
            }
        }
    }
}
