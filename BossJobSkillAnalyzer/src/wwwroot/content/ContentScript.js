// Boss 直聘职位技能分析插件 - Content Script
// 这个脚本会被注入到 Boss 直聘页面中

(function() {
    'use strict';

    // 检查是否已经初始化
    if (window.__bossJobAnalyzerInitialized) {
        return;
    }
    window.__bossJobAnalyzerInitialized = true;

    console.log('Boss Job Analyzer Content Script loaded');

    // 创建 Sidebar 容器
    function createSidebarContainer() {
        const containerId = 'boss-job-analyzer-sidebar-container';

        // 避免重复创建
        if (document.getElementById(containerId)) {
            return document.getElementById(containerId);
        }

        // 创建容器
        const container = document.createElement('div');
        container.id = containerId;
        container.innerHTML = `
            <div id="boss-job-analyzer-sidebar-root"></div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #boss-job-analyzer-sidebar-container {
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 8px rgba(0,0,0,0.1);
                z-index: 2147483647;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            #boss-job-analyzer-sidebar-container.collapsed {
                transform: translateX(100%);
            }

            #boss-job-analyzer-sidebar-root {
                width: 100%;
                height: 100%;
                overflow-y: auto;
            }

            .boss-job-analyzer-toggle-btn {
                position: fixed;
                top: 50%;
                right: 400px;
                transform: translateY(-50%);
                width: 32px;
                height: 80px;
                background: #1976d2;
                color: white;
                border: none;
                border-radius: 4px 0 0 4px;
                cursor: pointer;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: right 0.3s ease;
            }

            .boss-job-analyzer-toggle-btn.sidebar-closed {
                right: 0;
                border-radius: 4px 0 0 4px;
            }

            #boss-job-analyzer-sidebar-container.collapsed + .boss-job-analyzer-toggle-btn {
                right: 0;
            }
        `;

        document.head.appendChild(style);

        // 创建切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'boss-job-analyzer-toggle-btn';
        toggleBtn.innerHTML = '◀';
        toggleBtn.onclick = function() {
            container.classList.toggle('collapsed');
            this.innerHTML = container.classList.contains('collapsed') ? '▶' : '◀';
        };

        document.body.appendChild(container);
        document.body.appendChild(toggleBtn);

        return container;
    }

    // 初始化 Sidebar
    function initSidebar() {
        const container = createSidebarContainer();
        const root = document.getElementById('boss-job-analyzer-sidebar-root');

        // 创建一个简单的初始界面
        root.innerHTML = `
            <div style="padding: 20px;">
                <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Boss 职位技能分析</h3>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">插件正在初始化...</p>
                </div>
                <div style="font-size: 12px; color: #999; line-height: 1.6;">
                    <p>请在配置中填写：</p>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li>API Base URL</li>
                        <li>API Key</li>
                        <li>Model 名称</li>
                    </ul>
                </div>
            </div>
        `;

        // 监听来自 Blazor 的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            handleMessage(message, sender, sendResponse);
            return true; // 保持消息通道开放以支持异步响应
        });
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
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // 页面导航后重新初始化
            setTimeout(initSidebar, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

})();
