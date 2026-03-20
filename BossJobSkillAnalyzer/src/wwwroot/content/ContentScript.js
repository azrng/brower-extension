// Boss 直聘职位技能分析插件 - Content Script
// 这个脚本会被注入到 Boss 直聘页面中

(function() {
    'use strict';

    // 检查是否已经初始化
    if (window.__bossJobAnalyzerInitialized) {
        return;
    }
    window.__bossJobAnalyzerInitialized = true;

    // 标记UI是否已经加载
    window.__bossJobAnalyzerUILoaded = false;

    // 禁用console.log，避免被检测
    const originalLog = console.log;
    console.log = function() {
        // 只输出关键错误，其他日志禁用
        if (arguments[0] && arguments[0].toString().includes('Error')) {
            originalLog.apply(console, arguments);
        }
    };

    // 延迟初始化，避免被立即检测
    setTimeout(() => {
        try {
            initSidebar();
        } catch (error) {
            originalLog('[Boss Analyzer] Init error:', error);
        }
    }, 2000); // 延迟2秒加载

    // 创建 Sidebar 容器（使用隐蔽的名称）
    function createSidebarContainer() {
        const containerId = 'ja-sidebar-container'; // 使用隐蔽的ID

        // 避免重复创建
        if (document.getElementById(containerId)) {
            return document.getElementById(containerId);
        }

        // 创建容器
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'ja-ext-sidebar'; // 使用普通的class名

        // 使用内联样式，不使用style标签
        container.style.cssText = 'position: fixed; top: 0; right: 0; width: 380px; height: 100vh; background: #fff; box-shadow: -2px 0 8px rgba(0,0,0,0.1); z-index: 999999; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';

        container.innerHTML = `
            <div id="ja-sidebar-root" style="width: 100%; height: 100%; overflow-y: auto;"></div>
        `;

        // 创建切换按钮
        if (!document.getElementById('ja-toggle-btn')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'ja-toggle-btn';
            toggleBtn.className = 'ja-toggle';
            toggleBtn.style.cssText = 'position: fixed; top: 50%; right: 380px; transform: translateY(-50%); width: 32px; height: 80px; background: #1976d2; color: white; border: none; border-radius: 4px 0 0 4px; cursor: pointer; z-index: 999998; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.3s ease;';
            toggleBtn.innerHTML = '◀';
            toggleBtn.onclick = function() {
                const isCollapsed = container.style.transform === 'translateX(100%)';
                container.style.transform = isCollapsed ? 'translateX(0)' : 'translateX(100%)';
                this.style.right = isCollapsed ? '380px' : '0';
                this.innerHTML = isCollapsed ? '◀' : '▶';
            };
            document.body.appendChild(toggleBtn);
        }

        document.body.appendChild(container);

        return container;
    }

    // 初始化 Sidebar
    function initSidebar() {
        const container = createSidebarContainer();
        const root = document.getElementById('ja-sidebar-root');

        if (!root) {
            console.error('[Job Analyzer] Root element not found');
            return;
        }

        // 加载配置并创建界面
        loadConfigAndCreateUI(root);

        // 监听来自 Blazor 的消息
        try {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                handleMessage(message, sender, sendResponse);
                return true;
            });
        } catch (e) {
            // 忽略chrome API错误
        }
    }

    // 加载配置并创建 UI
    async function loadConfigAndCreateUI(root) {
        // 如果UI已经加载，只更新配置状态，不重建整个UI
        if (window.__bossJobAnalyzerUILoaded) {
            updateConfigStatus();
            return;
        }

        try {
            // 从 chrome.storage 加载配置
            const result = await new Promise((resolve) => {
                chrome.storage.local.get('boss_job_analyzer_config', resolve);
            });

            const config = result['boss_job_analyzer_config'];
            const configObj = config ? JSON.parse(config) : null;

            const isConfigured = configObj &&
                (configObj.apiBaseUrl || configObj.ApiBaseUrl) &&
                (configObj.apiKey || configObj.ApiKey) &&
                (configObj.model || configObj.Model);

            // 统一字段名（使用大写的）
            if (configObj) {
                if (configObj.apiBaseUrl) configObj.ApiBaseUrl = configObj.apiBaseUrl;
                if (configObj.apiKey) configObj.ApiKey = configObj.apiKey;
                if (configObj.model) configObj.Model = configObj.model;
            }

            // 保存配置到全局变量，供后续更新使用
            window.__bossJobAnalyzerConfig = configObj;

            // 创建界面（使用更简洁的UI）
            root.innerHTML = `
                <div style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">职位分析</h3>
                        <button id="ja-config-btn" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">⚙️ 配置</button>
                    </div>

                    <div id="ja-config-status" style="background: ${isConfigured ? '#d4edda' : '#fff3cd'}; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px;">
                        ${isConfigured ?
                            '<strong style="color: #155724;">✅ 已配置</strong><br><span style="color: #155724;">Model: ' + (configObj.Model || '未设置') + '</span>' :
                            '<strong style="color: #856404;">⚠️ 未配置</strong><br><span style="color: #856404;">请点击插件图标配置</span>'
                        }
                    </div>

                    <div style="margin-bottom: 16px;">
                        <button id="ja-start-btn" style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; ${!isConfigured ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${!isConfigured ? 'disabled' : ''}>
                            🚀 开始分析
                        </button>
                    </div>

                    <div id="ja-progress-area" style="display: none; background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span>状态：</span>
                                <span id="ja-status-text">准备中...</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>进度：</span>
                                <span id="ja-progress-text">0 / 0</span>
                            </div>
                        </div>
                        <div style="height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
                            <div id="ja-progress-bar" style="height: 100%; background: #1976d2; width: 0%; transition: width 0.3s;"></div>
                        </div>
                    </div>

                    <div id="ja-result-area" style="display: none;">
                        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">分析结果</h4>
                        <div id="ja-result-content" style="background: #f9f9f9; padding: 12px; border-radius: 6px; font-size: 13px; max-height: 400px; overflow-y: auto;">
                        </div>
                    </div>
                </div>
            `;

            // 绑定事件
            document.getElementById('ja-config-btn').addEventListener('click', function() {
                chrome.runtime.openOptionsPage();
            });

            if (isConfigured) {
                document.getElementById('ja-start-btn').addEventListener('click', function() {
                    startAnalysis(configObj);
                });
            }

            // 标记UI已加载
            window.__bossJobAnalyzerUILoaded = true;
            console.log('[Boss Analyzer] UI loaded successfully');
        } catch (error) {
            console.error('[Boss Analyzer] Error loading config:', error);
            root.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <p style="color: #dc3545; font-size: 14px;">⚠️ 加载配置失败</p>
                    <p style="color: #666; font-size: 12px; margin-top: 8px;">请刷新页面重试</p>
                </div>
            `;
        }
    }

    // 更新配置状态（不重建UI）
    function updateConfigStatus() {
        const statusElement = document.getElementById('ja-config-status');
        if (!statusElement) return;

        // 重新加载配置
        chrome.storage.local.get('boss_job_analyzer_config', (result) => {
            const config = result['boss_job_analyzer_config'];
            const configObj = config ? JSON.parse(config) : null;

            const isConfigured = configObj &&
                (configObj.apiBaseUrl || configObj.ApiBaseUrl) &&
                (configObj.apiKey || configObj.ApiKey) &&
                (configObj.model || configObj.Model);

            // 统一字段名
            if (configObj) {
                if (configObj.apiBaseUrl) configObj.ApiBaseUrl = configObj.apiBaseUrl;
                if (configObj.apiKey) configObj.ApiKey = configObj.apiKey;
                if (configObj.model) configObj.Model = configObj.model;
            }

            // 更新状态显示
            if (isConfigured) {
                statusElement.style.background = '#d4edda';
                statusElement.innerHTML = '<strong style="color: #155724;">✅ 已配置</strong><br><span style="color: #155724;">Model: ' + (configObj.Model || '未设置') + '</span>';
            } else {
                statusElement.style.background = '#fff3cd';
                statusElement.innerHTML = '<strong style="color: #856404;">⚠️ 未配置</strong><br><span style="color: #856404;">请点击插件图标配置</span>';
            }

            // 更新开始按钮状态
            const startBtn = document.getElementById('ja-start-btn');
            if (startBtn) {
                if (isConfigured) {
                    startBtn.disabled = false;
                    startBtn.style.opacity = '1';
                    startBtn.style.cursor = 'pointer';
                } else {
                    startBtn.disabled = true;
                    startBtn.style.opacity = '0.5';
                    startBtn.style.cursor = 'not-allowed';
                }
            }
        });
    }

    // 开始分析
    async function startAnalysis(config) {
        const progressArea = document.getElementById('ja-progress-area');
        const statusText = document.getElementById('ja-status-text');
        const progressText = document.getElementById('ja-progress-text');
        const progressBar = document.getElementById('ja-progress-bar');
        const resultArea = document.getElementById('ja-result-area');
        const resultContent = document.getElementById('ja-result-content');
        const startBtn = document.getElementById('ja-start-btn');

        progressArea.style.display = 'block';
        resultArea.style.display = 'none';
        startBtn.disabled = true;
        startBtn.textContent = '⏳ 分析中...';

        try {
            statusText.textContent = '正在读取职位列表...';

            // 提取当前页职位
            const jobs = extractJobList();
            statusText.textContent = `找到 ${jobs.length} 个职位`;

            if (jobs.length === 0) {
                throw new Error('未找到职位，请确保在搜索页面');
            }

            progressText.textContent = `0 / ${jobs.length}`;
            progressBar.style.width = '0%';

            // 模拟分析过程（实际应该调用 AI API）
            statusText.textContent = '正在分析职位...';
            const results = [];

            for (let i = 0; i < Math.min(jobs.length, 5); i++) {
                const job = jobs[i];
                statusText.textContent = `正在分析: ${job.title}`;
                progressText.textContent = `${i + 1} / ${jobs.length}`;
                progressBar.style.width = `${((i + 1) / jobs.length * 100)}%`;

                // 这里应该调用 AI API，暂时显示模拟结果
                await new Promise(resolve => setTimeout(resolve, 1000));
                results.push({
                    title: job.title,
                    skills: ['技能1', '技能2', '技能3']
                });
            }

            // 显示结果
            statusText.textContent = '✅ 分析完成';
            progressBar.style.width = '100%';

            let resultHTML = '<div style="margin-bottom: 12px;"><strong>📊 统计信息</strong></div>';
            resultHTML += `<div style="margin-bottom: 8px;">分析职位数: ${results.length}</div>`;

            resultHTML += '<div style="margin-bottom: 12px;"><strong>💼 职位列表</strong></div>';
            results.forEach((item, index) => {
                resultHTML += `
                    <div style="padding: 8px; margin-bottom: 8px; background: white; border-radius: 4px;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${index + 1}. ${item.title}</div>
                        <div style="font-size: 12px; color: #666;">技能: ${item.skills.join(', ')}</div>
                    </div>
                `;
            });

            resultHTML += '<div style="margin-top: 12px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;">';
            resultHTML += '⚠️ 这是演示结果。完整功能需要配置 AI API 并实现调用逻辑。';
            resultHTML += '</div>';

            resultContent.innerHTML = resultHTML;
            resultArea.style.display = 'block';

        } catch (error) {
            statusText.textContent = '❌ 分析失败';
            resultContent.innerHTML = `<div style="color: #dc3545;">错误: ${error.message}</div>`;
            resultArea.style.display = 'block';
        } finally {
            startBtn.disabled = false;
            startBtn.textContent = '🚀 开始识别';
        }
    }

    // 处理消息
    async function handleMessage(message, sender, sendResponse) {
        const action = message.action;

        try {
            switch (action) {
                case 'extractJobList':
                    const jobs = extractJobList();
                    sendResponse({ jobs: jobs });
                    break;

                case 'extractJobDetail':
                    const detail = extractJobDetail();
                    sendResponse({ detail: detail });
                    break;

                case 'goToNextPage':
                    const success = goToNextPage();
                    sendResponse({ success: success });
                    break;

                case 'updateSidebar':
                    // 更新 Sidebar 内容
                    if (message.html) {
                        const root = document.getElementById('boss-job-analyzer-sidebar-root');
                        if (root) {
                            root.innerHTML = message.html;
                        }
                    }
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            sendResponse({ error: error.message });
        }
    }

    // 提取职位列表
    function extractJobList() {
        const jobs = [];

        try {
            // Boss 直聘的职位列表选择器
            // 注意：这些选择器可能需要根据实际页面结构调整
            const jobCards = document.querySelectorAll('.job-card-wrapper');

            jobCards.forEach(card => {
                const titleElement = card.querySelector('.job-title');
                const linkElement = card.querySelector('.job-card-left') ||
                                   card.querySelector('a.job-info') ||
                                   card.querySelector('a[href*="/job_detail/"]');

                if (titleElement && linkElement) {
                    let url = linkElement.getAttribute('href') || '';
                    if (url && !url.startsWith('http')) {
                        url = 'https://www.zhipin.com' + url;
                    }

                    jobs.push({
                        title: titleElement.textContent.trim(),
                        url: url,
                        elementId: Element.prototype.getAttribute.call(card, 'data-jobid') || ''
                    });
                }
            });
        } catch (error) {
            console.error('Error extracting job list:', error);
        }

        return jobs;
    }

    // 提取职位详情
    function extractJobDetail() {
        try {
            // Boss 直聘的职位详情页选择器
            // 注意：这些选择器可能需要根据实际页面结构调整

            // 提取经验要求
            let experience = '';
            const experienceElements = document.querySelectorAll('.job-sec-text');
            experienceElements.forEach(el => {
                const text = el.textContent.trim();
                if (text.includes('经验') || text.includes('年')) {
                    experience = text;
                }
            });

            // 提取岗位描述
            let description = '';
            const descElement = document.querySelector('.job-sec-text') ||
                              document.querySelector('.text-describe');
            if (descElement) {
                description = descElement.textContent.trim();
            }

            // 如果没有找到描述，尝试其他选择器
            if (!description) {
                const jobDetailText = document.querySelector('.job-detail');
                if (jobDetailText) {
                    description = jobDetailText.textContent.trim();
                }
            }

            return {
                experience: experience,
                description: description
            };
        } catch (error) {
            console.error('Error extracting job detail:', error);
            return {
                experience: '',
                description: ''
            };
        }
    }

    // 翻到下一页
    function goToNextPage() {
        try {
            // 查找下一页按钮
            const nextButton = document.querySelector('.next') ||
                              document.querySelector('.ui-icon-arrow-right')?.parentElement ||
                              document.querySelector('a[ka="search-next"]');

            if (nextButton) {
                nextButton.click();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error going to next page:', error);
            return false;
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }

    // 监听 URL 变化（SPA 页面导航）
    // 完全禁用URL监听，避免闪烁
    // Boss直聘是SPA，侧边栏在页面加载后一直存在

    // 防抖重载函数（保留但禁用）
    /*
    let reloadTimeout = null;
    function reloadSidebar() {
        if (reloadTimeout) {
            clearTimeout(reloadTimeout);
        }
        reloadTimeout = setTimeout(() => {
            const root = document.getElementById('boss-job-analyzer-sidebar-root');
            if (root && !window.__bossJobAnalyzerUILoaded) {
                // 只有在UI未加载时才创建
                loadConfigAndCreateUI(root);
            } else if (window.__bossJobAnalyzerUILoaded) {
                // UI已加载，只更新配置状态
                updateConfigStatus();
            }
        }, 500);
    }
    */

    // 页面加载完成后初始化（延迟加载）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initSidebar, 2000);
        });
    } else {
        setTimeout(initSidebar, 2000);
    }

    // 恢复console.log
    setTimeout(() => {
        console.log = originalLog;
    }, 3000);

})();
