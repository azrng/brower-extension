using BossJobSkillAnalyzer.Models;

namespace BossJobSkillAnalyzer.Services
{
    public class OpenAIService
    {
        private readonly HttpClient _httpClient;

        public OpenAIService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<SkillAnalysisResult> AnalyzeSingleJobAsync(
            JobInfo job,
            PluginConfig config)
        {
            var prompt = BuildSingleJobPrompt(job);
            var response = await CallOpenAIAsync(prompt, config);

            return ParseSingleJobResult(response);
        }

        public async Task<SkillAnalysisResult> AnalyzeAggregatedResultsAsync(
            List<SkillAnalysisResult> individualResults,
            PluginConfig config)
        {
            var prompt = BuildAggregatePrompt(individualResults);
            var response = await CallOpenAIAsync(prompt, config);

            return ParseAggregateResult(response, individualResults);
        }

        private string BuildSingleJobPrompt(JobInfo job)
        {
            return $@"请分析以下职位的技能要求，提取关键信息：

职位名称：{job.Title}

经验要求：
{job.Experience}

岗位描述：
{job.Description}

请以 JSON 格式返回：
{{
  ""keywords"": [""技能1"", ""技能2"", ...],
  ""categories"": [
    {{""name"": ""分类名称"", ""skills"": [""技能1"", ""技能2""]}}
  ],
  ""synonyms"": {{""原词"": ""标准词""}}
}}

只返回 JSON，不要其他说明。";
        }

        private string BuildAggregatePrompt(List<SkillAnalysisResult> results)
        {
            var allKeywords = results
                .SelectMany(r => r.Keywords)
                .Distinct()
                .ToList();

            return $@"基于以下多个职位的分析结果，请提供最终的技能汇总：

发现的技能关键词：
{string.Join(", ", allKeywords)}

请以 JSON 格式返回：
{{
  ""keywords"": [""标准化后的技能列表""],
  ""categories"": [
    {{""name"": ""分类名称"", ""skills"": [""技能1"", ""技能2""]}}
  ],
  ""frequencies"": {{""技能名"": 出现次数}},
  ""synonymMappings"": {{""原词"": ""标准词""}},
  ""summary"": ""1-3句话总结岗位技能画像""
}}

只返回 JSON，不要其他说明。";
        }

        private async Task<string> CallOpenAIAsync(string prompt, PluginConfig config)
        {
            var requestBody = new
            {
                model = config.Model,
                messages = new[]
                {
                    new { role = "user", content = prompt }
                },
                temperature = 0.3
            };

            var request = new HttpRequestMessage(HttpMethod.Post, config.ApiBaseUrl.TrimEnd('/') + "/chat/completions");
            request.Headers.Add("Authorization", $"Bearer {config.ApiKey}");
            request.Content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(requestBody),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var jsonDoc = System.Text.Json.JsonDocument.Parse(responseContent);
            return jsonDoc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? string.Empty;
        }

        private SkillAnalysisResult ParseSingleJobResult(string aiResponse)
        {
            try
            {
                // 清理可能的 markdown 代码块标记
                var cleaned = aiResponse.Trim();
                if (cleaned.StartsWith("```json"))
                {
                    cleaned = cleaned.Substring(7);
                }
                if (cleaned.StartsWith("```"))
                {
                    cleaned = cleaned.Substring(3);
                }
                if (cleaned.EndsWith("```"))
                {
                    cleaned = cleaned.Substring(0, cleaned.Length - 3);
                }
                cleaned = cleaned.Trim();

                var result = System.Text.Json.JsonSerializer.Deserialize<SkillAnalysisResult>(cleaned);
                return result ?? new SkillAnalysisResult();
            }
            catch
            {
                return new SkillAnalysisResult();
            }
        }

        private SkillAnalysisResult ParseAggregateResult(
            string aiResponse,
            List<SkillAnalysisResult> individualResults)
        {
            try
            {
                var cleaned = aiResponse.Trim();
                if (cleaned.StartsWith("```json"))
                {
                    cleaned = cleaned.Substring(7);
                }
                if (cleaned.StartsWith("```"))
                {
                    cleaned = cleaned.Substring(3);
                }
                if (cleaned.EndsWith("```"))
                {
                    cleaned = cleaned.Substring(0, cleaned.Length - 3);
                }
                cleaned = cleaned.Trim();

                var result = System.Text.Json.JsonSerializer.Deserialize<SkillAnalysisResult>(cleaned);
                if (result != null)
                {
                    result.Meta = new AnalysisMeta
                    {
                        ProcessedPages = individualResults.Count,
                        TotalJobs = individualResults.Count,
                        Timestamp = DateTime.Now
                    };
                    return result;
                }
            }
            catch { }

            return new SkillAnalysisResult();
        }
    }
}
