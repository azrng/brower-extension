namespace BossJobSkillAnalyzer.Models
{
    public class JobInfo
    {
        public string JobId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Experience { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsExtracted { get; set; }
        public bool AnalysisCompleted { get; set; }
        public string? ErrorMessage { get; set; }
    }
}