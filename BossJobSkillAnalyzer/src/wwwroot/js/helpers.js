// 下载 JSON 文件
window.downloadJson = function(jsonContent, fileName) {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// 启动 Sidebar 组件
window.startBossSidebar = function(containerId) {
    // 这个函数将在 Blazor 加载后被调用
    console.log('Starting Boss Job Analyzer Sidebar in', containerId);
};
