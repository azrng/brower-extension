namespace BossJobSkillAnalyzer.Models
{
    public class TaskProgress
    {
        public AnalysisStatus Status { get; set; }
        public TaskStage Stage { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
        public int ProcessedJobs { get; set; }
        public int TotalJobs { get; set; }
        public string LastMessage { get; set; } = string.Empty;
        public SkillAnalysisResult? Result { get; set; }
    }
}