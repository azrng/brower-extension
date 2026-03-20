using Blazor.BrowserExtension;

namespace BossJobSkillAnalyzer
{
    public partial class BackgroundWorker : BackgroundWorkerBase
    {
        [BackgroundWorkerMain]
        public override void Main()
        {
            WebExtensions.Runtime.OnInstalled.AddListener(OnInstalled);
        }

        async Task OnInstalled()
        {
            // 安装时不自动打开页面，让用户主动使用
            Console.WriteLine("Boss Job Skill Analyzer installed");
        }
    }
}
