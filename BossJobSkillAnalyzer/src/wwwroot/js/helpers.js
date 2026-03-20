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

// Chrome Storage 辅助函数
window.chromeStorageGet = function(key) {
    return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get([key], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('[chromeStorageGet] Error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    const value = result[key];
                    console.log('[chromeStorageGet] Retrieved:', key, value);
                    resolve(value || null);
                }
            });
        } else {
            console.error('[chromeStorageGet] Chrome storage API not available');
            reject(new Error('Chrome storage API not available'));
        }
    });
};

window.chromeStorageSet = function(key, value) {
    return new Promise((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const data = {};
            data[key] = value;
            chrome.storage.local.set(data, function() {
                if (chrome.runtime.lastError) {
                    console.error('[chromeStorageSet] Error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('[chromeStorageSet] Saved:', key, value);
                    resolve();
                }
            });
        } else {
            console.error('[chromeStorageSet] Chrome storage API not available');
            reject(new Error('Chrome storage API not available'));
        }
    });
};

// 启动 Sidebar 组件
window.startBossSidebar = function(containerId) {
    // 这个函数将在 Blazor 加载后被调用
    console.log('Starting Boss Job Analyzer Sidebar in', containerId);
};
