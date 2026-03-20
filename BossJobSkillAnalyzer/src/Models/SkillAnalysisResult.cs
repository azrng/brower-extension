namespace BossJobSkillAnalyzer.Models
{
    public class SkillAnalysisResult
    {
        public List<string> Keywords { get; set; } = new();
        public List<SkillCategory> Categories { get; set; } = new();
        public Dictionary<string, int> Frequencies { get; set; } = new();
        public Dictionary<string, string> SynonymMappings { get; set; } = new();
        public string Summary { get; set; } = string.Empty;
        public AnalysisMeta Meta { get; set; } = new();
    }

    public class SkillCategory
    {
        public string Name { get; set; } = string.Empty;
        public List<string> Skills { get; set; } = new();
    }

    public class AnalysisMeta
    {
        public int ProcessedPages { get; set; }
        public int TotalJobs { get; set; }
        public string ModelName { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.Now;
    }
}
