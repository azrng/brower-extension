namespace BossJobSkillAnalyzer.Models
{
    public enum TaskStage
    {
        Idle,
        ReadingJobList,
        OpeningJobDetail,
        ExtractingJobContent,
        CallingAI,
        AggregatingResults,
        Completed
    }

    public static class TaskStageExtensions
    {
        public static string GetDisplayName(this TaskStage stage)
        {
            return stage switch
            {
                TaskStage.Idle => "待机",
                TaskStage.ReadingJobList => "正在读取当前页职位列表",
                TaskStage.OpeningJobDetail => "正在打开职位详情",
                TaskStage.ExtractingJobContent => "正在提取职位内容",
                TaskStage.CallingAI => "正在调用 AI 分析",
                TaskStage.AggregatingResults => "正在汇总技能结果",
                TaskStage.Completed => "任务完成",
                _ => "未知状态"
            };
        }
    }
}