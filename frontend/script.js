// 使用API服务，数据已在api.js中定义

// DOM元素
let topNavbar;
let resultsSection;
let searchInput;
let searchBtn;
let primaryResult;
let secondaryResults;
let clickDetails;
let reportModal;
let closeModal;
let submitReport;
let reportText;
let toast;
let themeToggle;

// 当前报告的名片ID
let currentReportId = null;

// 初始化
function init() {
    // 获取DOM元素
    topNavbar = document.getElementById('top-navbar');
    resultsSection = document.getElementById('results-section');
    searchInput = document.getElementById('search-input');
    searchBtn = document.getElementById('search-btn');
    primaryResult = document.getElementById('primary-result');
    secondaryResults = document.getElementById('secondary-results');
    clickDetails = document.getElementById('click-details');
    reportModal = document.getElementById('report-modal');
    closeModal = document.querySelector('.close');
    submitReport = document.getElementById('submit-report');
    reportText = document.getElementById('report-text');
    toast = document.getElementById('toast');
    themeToggle = document.getElementById('theme-toggle');

    // 主题切换初始化
    initThemeToggle();

    // 添加搜索事件监听
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 添加模态框事件监听
    closeModal.addEventListener('click', closeReportModal);
    submitReport.addEventListener('click', handleReportSubmit);

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            closeReportModal();
        }
    });

    // 监听滚动事件
    window.addEventListener('scroll', handleScroll);
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 初始化主题切换
function initThemeToggle() {
    // 从localStorage获取主题偏好
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 设置初始主题
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }

    // 添加主题切换事件监听
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

// 处理搜索
async function handleSearch() {
    const keyword = searchInput.value.trim();
    if (!keyword) {
        showToast('请输入搜索关键词');
        return;
    }

    // 显示加载状态
    searchBtn.disabled = true;
    searchBtn.textContent = '搜索中...';

    try {
        // 从API搜索数据
        const results = await apiService.search(keyword);

        // 显示结果
        displayResults(results);

        // 显示结果区域
        resultsSection.classList.add('active');

        // 滚动到结果区域
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    } catch (error) {
        showToast('搜索失败，请稍后重试');
        console.error('搜索错误:', error);
    } finally {
        // 恢复按钮状态
        searchBtn.disabled = false;
        searchBtn.textContent = '搜索';
    }
}

// 显示结果
function displayResults(results) {
    if (results.length === 0) {
        primaryResult.innerHTML = '<div class="card"><div class="card-title">未找到相关结果</div></div>';
        secondaryResults.innerHTML = '';
        clickDetails.innerHTML = '';
        // 添加动画类
        setTimeout(() => {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => card.classList.add('fade-in'));
        }, 50);
        return;
    }

    // 显示最合适的搜索结果
    primaryResult.innerHTML = createCard(results[0]);

    // 显示其他搜索结果
    secondaryResults.innerHTML = results.slice(1).map(item => createCard(item)).join('');
    
    // 清空点击内容区域
    clickDetails.innerHTML = '';

    // 添加动画类
    setTimeout(() => {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => card.classList.add('fade-in'));
    }, 50);

    // 添加点击事件
    addClickEvents();

    // 添加错误上报事件
    addReportEvents();
}

// 创建名片
function createCard(data) {
    let phoneHTML = '';
    if (data.phone && data.phone.length > 0) {
        // 处理分号分隔的电话
        const allPhones = data.phone.flatMap(phone => phone.split(';')).filter(Boolean);
        phoneHTML = allPhones.map(phone => 
            `<div class="card-item" data-copy="${phone}">
                <span class="card-item-icon">📞</span>
                <div class="card-item-content">
                    <div class="card-item-label">官方电话</div>
                    <div class="card-item-value">${phone}</div>
                </div>
            </div>`
        ).join('');
    }

    let emailHTML = '';
    if (data.email && data.email.length > 0) {
        // 处理分号分隔的邮箱
        const allEmails = data.email.flatMap(email => email.split(';')).filter(Boolean);
        emailHTML = allEmails.map(email => 
            `<div class="card-item" data-copy="${email}">
                <span class="card-item-icon">✉️</span>
                <div class="card-item-content">
                    <div class="card-item-label">官方邮箱</div>
                    <div class="card-item-value">${email}</div>
                </div>
            </div>`
        ).join('');
    }

    let websiteHTML = '';
    if (data.website) {
        websiteHTML = `
            <div class="card-item" data-copy="${data.website}">
                <span class="card-item-icon">🌐</span>
                <div class="card-item-content">
                    <div class="card-item-label">官方网站</div>
                    <div class="card-item-value">${data.website}</div>
                </div>
            </div>
        `;
    }

    let addressHTML = '';
    if (data.address) {
        addressHTML = `
            <div class="card-item" data-copy="${data.address}">
                <span class="card-item-icon">📍</span>
                <div class="card-item-content">
                    <div class="card-item-label">详细地址</div>
                    <div class="card-item-value">${data.address}</div>
                </div>
            </div>
        `;
    }

    // 新增二维码字段支持
    let qrCodeHTML = '';
    if (data.qrCode) {
        qrCodeHTML = `
            <div class="card-item">
                <span class="card-item-icon">📱</span>
                <div class="card-item-content">
                    <div class="card-item-label">微信二维码</div>
                    <div class="card-item-value">
                        <img src="${data.qrCode}" alt="${data.name}二维码" style="max-width: 150px; border-radius: 8px;">
                    </div>
                </div>
            </div>
        `;
    }

    // 新增描述显示
    let descriptionHTML = '';
    if (data.description) {
        descriptionHTML = `
            <div class="card-item">
                <span class="card-item-icon">📝</span>
                <div class="card-item-content">
                    <div class="card-item-label">描述</div>
                    <div class="card-item-value">${data.description}</div>
                </div>
            </div>
        `;
    }

    // 新增分类显示
    let categoryHTML = '';
    if (data.category) {
        categoryHTML = `
            <div class="card-item">
                <span class="card-item-icon">🏷️</span>
                <div class="card-item-content">
                    <div class="card-item-label">分类</div>
                    <div class="card-item-value">${data.category}</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="card" data-id="${data.id}">
            <div class="card-header">
                <div class="card-title">${data.name}</div>
                <button class="report-btn" data-id="${data.id}">错误上报</button>
            </div>
            <div class="card-content">
                ${websiteHTML}
                ${descriptionHTML}
                ${phoneHTML}
                ${emailHTML}
                ${addressHTML}
                ${categoryHTML}
                ${qrCodeHTML}
            </div>
        </div>
    `;
}

// 添加点击事件 - 显示详情和复制按钮
function addClickEvents() {
    const cardItems = document.querySelectorAll('.card-item');
    cardItems.forEach(item => {
        item.addEventListener('click', () => {
            const text = item.getAttribute('data-copy');
            if (text) {
                showItemDetails(item, text);
            }
        });
    });
}

// 显示条目详情模态框
function showItemDetails(cardItem, text) {
    // 检查是否已存在模态框，若存在则先移除
    let modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
    }
    
    // 创建模态框覆盖层
    modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // 创建模态框内容
    const modalContent = document.createElement('div');
    modalContent.className = 'click-details-modal';
    modalContent.innerHTML = `
        <h3>点击内容</h3>
        <div class="detail-content">${text}</div>
        <button class="copy-btn" data-text="${text}">复制</button>
    `;
    
    // 添加复制按钮事件
    modalContent.querySelector('.copy-btn').addEventListener('click', () => {
        copyToClipboard(text);
        showToast('已复制到剪贴板');
        hideItemDetailsModal();
    });
    
    // 将内容添加到覆盖层
    modalOverlay.appendChild(modalContent);
    
    // 添加到页面
    document.body.appendChild(modalOverlay);
    
    // 显示模态框
    setTimeout(() => {
        modalOverlay.classList.add('active');
    }, 10);
    
    // 添加点击外部关闭事件
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            hideItemDetailsModal();
        }
    });
}

// 隐藏并销毁条目详情模态框
function hideItemDetailsModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        // 动画完成后移除元素
        setTimeout(() => {
            modalOverlay.remove();
        }, 300);
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

// 添加错误上报事件
function addReportEvents() {
    const reportBtns = document.querySelectorAll('.report-btn');
    reportBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentReportId = btn.getAttribute('data-id');
            openReportModal();
        });
    });
}

// 打开错误上报模态框
function openReportModal() {
    reportText.value = '';
    reportModal.style.display = 'block';
}

// 关闭错误上报模态框
function closeReportModal() {
    reportModal.style.display = 'none';
    currentReportId = null;
}

// 处理错误上报提交
function handleReportSubmit() {
    const reportContent = reportText.value.trim();
    if (!reportContent) {
        showToast('请描述您发现的问题');
        return;
    }

    // 这里可以添加实际的上报逻辑
    console.log('错误上报:', {
        id: currentReportId,
        content: reportContent,
        timestamp: new Date().toISOString()
    });

    showToast('感谢您的反馈');
    closeReportModal();
}

// 监听滚动
function handleScroll() {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // 当滚动到页面底部附近时，显示更多结果
    if (documentHeight - (scrollPosition + windowHeight) < 300) {
        moreResults.classList.add('active');
        
        // 为新显示的卡片添加动画效果
        setTimeout(() => {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                if (!card.classList.contains('fade-in')) {
                    card.classList.add('fade-in');
                }
            });
        }, 50);
    }
    
    // 显示/隐藏更多结果提示
    if (moreResults.children.length > 0 && !moreResults.classList.contains('active')) {
        moreHint.style.opacity = '1';
        moreHint.classList.add('active');
    } else {
        moreHint.style.opacity = '0';
        moreHint.classList.remove('active');
    }
}

// 显示提示
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);