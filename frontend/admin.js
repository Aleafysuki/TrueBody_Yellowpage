/**
 * 名片管理系统 - 管理界面JavaScript
 */

// API基础URL - 从全局配置读取，默认为后端服务地址
let API_BASE_URL = 'http://localhost:3000/api/admin';

// 检查是否有全局配置
if (window && window.appConfig && window.appConfig.apiUrl) {
    API_BASE_URL = `${window.appConfig.apiUrl}/api/admin`;
}

// DOM元素
let cardsTableBody;
let addBtn;
let refreshBtn;
let saveBtn;
let confirmDeleteBtn;
let statusMessage;
let cardModal;
let deleteModal;
let categoryFilter;
let searchInput;

// 错误反馈相关DOM元素
let feedbackTableBody;
let refreshFeedbackBtn;
let saveFeedbackBtn;
let feedbackModal;

// 当前操作的ID
let currentCardId = null;
let currentFeedbackId = null;

// 分类树结构
let categoryTree = [];

// 初始化
$(document).ready(function() {
    // 初始化DOM元素
    cardsTableBody = $('#cards-tbody');
    addBtn = $('#add-btn');
    refreshBtn = $('#refresh-btn');
    saveBtn = $('#save-btn');
    confirmDeleteBtn = $('#confirm-delete-btn');
    statusMessage = $('#status-message');
    cardModal = new bootstrap.Modal('#card-modal');
    deleteModal = new bootstrap.Modal('#delete-modal');
    categoryFilter = $('#category-filter');
    searchInput = $('#search-input');

    // 初始化错误反馈相关DOM元素
    feedbackTableBody = $('#feedback-tbody');
    refreshFeedbackBtn = $('#refresh-feedback-btn');
    saveFeedbackBtn = $('#save-feedback-btn');
    feedbackModal = new bootstrap.Modal('#feedback-modal');

    // 绑定事件
    addBtn.on('click', showAddModal);
    refreshBtn.on('click', loadCards);
    saveBtn.on('click', saveCard);
    confirmDeleteBtn.on('click', deleteCard);
    categoryFilter.on('change', filterCards);
    searchInput.on('input', filterCards);
    
    // 绑定错误反馈相关事件
    refreshFeedbackBtn.on('click', loadFeedback);
    saveFeedbackBtn.on('click', saveFeedback);

    // 加载名片数据
    loadCards();
    
    // 加载分类
    loadCategories();
    
    // 加载错误反馈数据
    loadFeedback();
});

// 显示添加模态框
function showAddModal() {
    currentCardId = null;
    $('#card-modal-label').text('添加名片');
    $('#card-form')[0].reset();
    cardModal.show();
}

// 显示编辑模态框
function showEditModal(id) {
    currentCardId = id;
    
    // 获取名片数据
    fetch(`${API_BASE_URL}/cards/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取名片数据失败');
            }
            return response.json();
        })
        .then(card => {
            // 填充表单
            $('#card-id').val(card.id);
            $('#card-name').val(card.name);
            $('#card-description').val(card.description || '');
            $('#card-website').val(card.website || '');
            $('#card-phone').val(card.phone && card.phone.length > 0 ? card.phone[0] : '');
            $('#card-email').val(card.email && card.email.length > 0 ? card.email[0] : '');
            $('#card-address').val(card.address || '');
            $('#card-qrcode').val(card.qrCode || '');
            $('#card-category').val(card.category || '');
            $('#card-search-keywords').val(card.searchKeywords || '');
            $('#card-last-updated').val(card.lastUpdated ? new Date(card.lastUpdated).toLocaleString() : '');

            
            // 显示模态框
            $('#card-modal-label').text('编辑名片');
            cardModal.show();
        })
        .catch(error => {
            showMessage('获取名片数据失败: ' + error.message, 'danger');
        });
}

// 保存名片
function saveCard() {
    // 验证表单
    if (!$('#card-name').val()) {
        showMessage('名称不能为空', 'danger');
        return;
    }

    // 收集表单数据
    const cardData = {
        name: $('#card-name').val(),
        description: $('#card-description').val() || null,
        website: $('#card-website').val() || null,
        phone: [$('#card-phone').val() || ''].filter(Boolean),
        email: [$('#card-email').val() || ''].filter(Boolean),
        address: $('#card-address').val() || null,
        qrCode: $('#card-qrcode').val() || null,
        category: $('#card-category').val() || null,
        searchKeywords: $('#card-search-keywords').val() || null
    };

    // 确定请求类型和URL
    const isEdit = !!currentCardId;
    const url = isEdit ? `${API_BASE_URL}/cards/${currentCardId}` : `${API_BASE_URL}/cards`;
    const method = isEdit ? 'PUT' : 'POST';

    // 发送请求
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || '保存失败');
                });
            }
            return response.json();
        })
        .then(data => {
            cardModal.hide();
            showMessage(data.message, 'success');
            loadCards();
            loadCategories();
        })
        .catch(error => {
            showMessage('保存失败: ' + error.message, 'danger');
        });
}

// 显示删除确认模态框
function showDeleteModal(id) {
    currentCardId = id;
    deleteModal.show();
}

// 删除名片
function deleteCard() {
    fetch(`${API_BASE_URL}/cards/${currentCardId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || '删除失败');
                });
            }
            return response.json();
        })
        .then(data => {
            deleteModal.hide();
            showMessage(data.message, 'success');
            loadCards();
            loadCategories();
        })
        .catch(error => {
            showMessage('删除失败: ' + error.message, 'danger');
        });
}

// 加载所有名片
function loadCards() {
    showMessage('正在加载数据...', 'info');
    
    fetch(`${API_BASE_URL}/cards`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据失败');
            }
            return response.json();
        })
        .then(cards => {
            renderCards(cards);
            statusMessage.empty();
        })
        .catch(error => {
            showMessage('获取数据失败: ' + error.message, 'danger');
        });
}

// 渲染名片列表
function renderCards(cards) {
    cardsTableBody.empty();
    
    if (cards.length === 0) {
        cardsTableBody.append(`
            <tr>
                <td colspan="9" class="text-center">暂无名片数据</td>
            </tr>
        `);
        return;
    }
    
    cards.forEach(card => {
        const cardRow = `
            <tr>
                <td>${card.id}</td>
                <td>${escapeHtml(card.name)}</td>
                <td>${card.website ? `<a href="${card.website}" target="_blank">${escapeHtml(card.website)}</a>` : '-'}</td>
                <td>${card.phone && card.phone.length > 0 ? escapeHtml(card.phone[0]) : '-'}</td>
                <td>${card.email && card.email.length > 0 ? escapeHtml(card.email[0]) : '-'}</td>
                <td>${escapeHtml(card.address || '-')}</td>
                <td>
                    <span class="badge ${card.category ? 'category-badge' : 'category-empty'}">
                        ${escapeHtml(card.category || '未分类')}
                    </span>
                </td>
                <td>${card.lastUpdated ? new Date(card.lastUpdated).toLocaleString() : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary action-btn" onclick="showEditModal(${card.id})"><i class="fa fa-pencil"></i> 编辑</button>
                    <button class="btn btn-sm btn-danger action-btn" onclick="showDeleteModal(${card.id})"><i class="fa fa-trash"></i> 删除</button>
                </td>
            </tr>
        `;
        
        cardsTableBody.append(cardRow);
    });
}

// 加载分类
function loadCategories() {
    fetch(`${API_BASE_URL}/categories`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取分类失败');
            }
            return response.json();
        })
        .then(categories => {
            // 清除现有选项（保留第一个）
            categoryFilter.find('option:not(:first)').remove();
            
            // 添加新选项
            categories.forEach(category => {
                categoryFilter.append(`<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`);
            });
        })
        .catch(error => {
            console.error('加载分类失败:', error);
        });
}

// 筛选名片
function filterCards() {
    const filterCategory = categoryFilter.val();
    const searchTerm = searchInput.val().toLowerCase();
    
    cardsTableBody.find('tr').each(function() {
        const row = $(this);
        const category = row.find('.badge').text().toLowerCase();
        const name = row.find('td:eq(1)').text().toLowerCase();
        const website = row.find('td:eq(2) a').text().toLowerCase();
        
        let show = true;
        
        // 分类筛选
        if (filterCategory && category !== filterCategory.toLowerCase()) {
            show = false;
        }
        
        // 搜索筛选
        if (searchTerm && !(name.includes(searchTerm) || website.includes(searchTerm))) {
            show = false;
        }
        
        row.toggle(show);
    });
}

// 显示状态消息
function showMessage(message, type = 'info') {
    statusMessage.html(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `);
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 错误反馈管理功能 ==========

// 加载所有错误反馈
function loadFeedback() {
    showMessage('正在加载错误反馈...', 'info');
    
    fetch(`${API_BASE_URL}/feedback`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取错误反馈失败');
            }
            return response.json();
        })
        .then(feedbacks => {
            renderFeedback(feedbacks);
            statusMessage.empty();
        })
        .catch(error => {
            showMessage('获取错误反馈失败: ' + error.message, 'danger');
        });
}

// 渲染错误反馈列表
function renderFeedback(feedbacks) {
    feedbackTableBody.empty();
    
    if (feedbacks.length === 0) {
        feedbackTableBody.append(`
            <tr>
                <td colspan="6" class="text-center">暂无错误反馈</td>
            </tr>
        `);
        return;
    }
    
    feedbacks.forEach(feedback => {
        const feedbackRow = `
            <tr>
                <td>${feedback.id}</td>
                <td>${feedback.cardName ? `<a href="javascript:void(0)" onclick="showEditModal(${feedback.cardId})"><strong>${escapeHtml(feedback.cardName)}</strong></a>` : '-'}</td>
                <td>${escapeHtml(feedback.content.substring(0, 50))}${feedback.content.length > 50 ? '...' : ''}</td>
                <td>${feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleString() : '-'}</td>
                <td>
                    <span class="badge ${getFeedbackStatusClass(feedback.status)}">
                        ${escapeHtml(feedback.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary action-btn" onclick="showFeedbackModal(${feedback.id})">
                        <i class="fa fa-eye"></i> 处理
                    </button>
                </td>
            </tr>
        `;
        
        feedbackTableBody.append(feedbackRow);
    });
}

// 根据反馈状态获取对应的CSS类
function getFeedbackStatusClass(status) {
    switch (status) {
        case '待处理':
            return 'bg-warning text-white';
        case '已处理':
            return 'bg-success text-white';
        case '已忽略':
            return 'bg-secondary text-white';
        default:
            return 'bg-info text-white';
    }
}

// 显示处理错误反馈模态框
function showFeedbackModal(id) {
    currentFeedbackId = id;
    
    // 获取反馈数据
    fetch(`${API_BASE_URL}/feedback`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取反馈数据失败');
            }
            return response.json();
        })
        .then(feedbacks => {
            const feedback = feedbacks.find(f => f.id === id);
            if (!feedback) {
                throw new Error('反馈数据不存在');
            }
            
            // 填充表单
            $('#feedback-id').val(feedback.id);
            $('#feedback-card').val(feedback.cardName || '无关联名片');
            $('#feedback-content').val(feedback.content);
            $('#feedback-submitted-at').val(feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleString() : '');
            $('#feedback-status').val(feedback.status || '待处理');
            $('#feedback-processed-by').val(feedback.processedBy || '');
            $('#feedback-resolution').val(feedback.resolution || '');
            
            // 显示模态框
            $('#feedback-modal-label').text('处理错误反馈');
            feedbackModal.show();
        })
        .catch(error => {
            showMessage('获取反馈数据失败: ' + error.message, 'danger');
        });
}

// 保存错误反馈处理结果
function saveFeedback() {
    // 验证表单
    if (!$('#feedback-status').val()) {
        showMessage('处理状态不能为空', 'danger');
        return;
    }

    // 收集表单数据
    const feedbackData = {
        status: $('#feedback-status').val(),
        processedBy: $('#feedback-processed-by').val() || null,
        resolution: $('#feedback-resolution').val() || null
    };

    // 发送请求
    fetch(`${API_BASE_URL}/feedback/${currentFeedbackId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedbackData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || '保存失败');
            });
        }
        return response.json();
    })
    .then(data => {
        feedbackModal.hide();
        showMessage(data.message, 'success');
        loadFeedback();
    })
    .catch(error => {
        showMessage('保存失败: ' + error.message, 'danger');
    });
}

// ========== 数据抓取功能 ==========

// 数据抓取相关DOM元素
let crawlUrlInput;
let crawlUrlsTextarea;
let addUrlBtn;
let addUrlsBtn;
let startCrawlBtn;
let stopCrawlBtn;
let clearQueueBtn;
let crawlStatus;
let queueSize;
let processedCount;
let crawlMessage;

// 初始化数据抓取功能
$(document).ready(function() {
    // 初始化DOM元素
    crawlUrlInput = $('#crawl-url-input');
    crawlUrlsTextarea = $('#crawl-urls-textarea');
    addUrlBtn = $('#add-url-btn');
    addUrlsBtn = $('#add-urls-btn');
    startCrawlBtn = $('#start-crawl-btn');
    stopCrawlBtn = $('#stop-crawl-btn');
    clearQueueBtn = $('#clear-queue-btn');
    crawlStatus = $('#crawl-status');
    queueSize = $('#queue-size');
    processedCount = $('#processed-count');
    crawlMessage = $('#crawl-message');

    // 绑定事件
    addUrlBtn.on('click', addUrlToQueue);
    addUrlsBtn.on('click', addUrlsToQueue);
    startCrawlBtn.on('click', startCrawling);
    stopCrawlBtn.on('click', stopCrawling);
    clearQueueBtn.on('click', clearCrawlQueue);

    // 每隔5秒更新一次抓取状态
    setInterval(updateCrawlStatus, 5000);
    
    // 初始更新一次状态
    updateCrawlStatus();
});

// 添加单个URL到抓取队列
function addUrlToQueue() {
    const url = crawlUrlInput.val().trim();
    if (!url) {
        showMessage('请输入要抓取的URL', 'warning');
        return;
    }
    
    addUrlsToQueue([url]);
    crawlUrlInput.val('');
}

// 批量添加URL到抓取队列
function addUrlsToQueue(urls) {
    // 如果没有提供urls参数，则从文本框中获取
    if (!urls) {
        urls = crawlUrlsTextarea.val()
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && url.startsWith('https://'));
        
        if (urls.length === 0) {
            showMessage('请输入有效的HTTPS URL', 'warning');
            return;
        }
        
        crawlUrlsTextarea.val('');
    }
    
    fetch(`${API_BASE_URL}/crawl/queue`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('添加URL到队列失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(data.message, 'success');
            updateCrawlStatus();
        } else {
            showMessage(data.message, 'warning');
        }
    })
    .catch(error => {
        showMessage('添加URL失败: ' + error.message, 'danger');
    });
}

// 启动抓取任务
function startCrawling() {
    fetch(`${API_BASE_URL}/crawl/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('启动抓取任务失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(data.message, 'success');
            updateCrawlStatus();
        } else {
            showMessage(data.message, 'warning');
        }
    })
    .catch(error => {
        showMessage('启动抓取失败: ' + error.message, 'danger');
    });
}

// 停止抓取任务
function stopCrawling() {
    fetch(`${API_BASE_URL}/crawl/stop`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('停止抓取任务失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(data.message, 'success');
            updateCrawlStatus();
        } else {
            showMessage(data.message, 'warning');
        }
    })
    .catch(error => {
        showMessage('停止抓取失败: ' + error.message, 'danger');
    });
}

// 加载分类树结构
function loadCategoryTree() {
    // 构建分类API地址
    let categoriesApiUrl = 'http://localhost:3000/api/categories';
    
    // 检查是否有全局配置
    if (window && window.appConfig && window.appConfig.apiUrl) {
        categoriesApiUrl = `${window.appConfig.apiUrl}/api/categories`;
    }
    
    $.ajax({
        url: categoriesApiUrl,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            categoryTree = data;
            populateCategorySelect('card-category-level1', data);
        },
        error: function(xhr, status, error) {
            console.error('加载分类树失败:', error);
        }
    });
}

// 填充分类选择框
function populateCategorySelect(selectId, categories) {
    const select = $('#' + selectId);
    select.empty();
    select.append('<option value="">请选择分类</option>');
    
    categories.forEach(category => {
        select.append(`<option value="${category.name}">${category.name}</option>`);
    });
}

// 填充子分类选择框
function populateSubCategorySelect(parentSelectId, childSelectId, selectedParent) {
    const childSelect = $('#' + childSelectId);
    childSelect.empty();
    childSelect.append('<option value="">请选择分类</option>');
    
    if (!selectedParent) {
        // 清空下一级分类
        if (childSelectId === 'card-category-level2') {
            populateSubCategorySelect(childSelectId, 'card-category-level3', '');
        }
        return;
    }
    
    // 查找选中的父分类
    let selectedCategory = null;
    function findCategory(categories) {
        for (const category of categories) {
            if (category.name === selectedParent) {
                selectedCategory = category;
                return;
            }
            if (category.children && category.children.length > 0) {
                findCategory(category.children);
            }
        }
    }
    
    findCategory(categoryTree);
    
    if (selectedCategory && selectedCategory.children) {
        selectedCategory.children.forEach(child => {
            childSelect.append(`<option value="${child.name}">${child.name}</option>`);
        });
    }
    
    // 清空下一级分类
    if (childSelectId === 'card-category-level2') {
        populateSubCategorySelect(childSelectId, 'card-category-level3', '');
    }
}

// 清空抓取队列
function clearCrawlQueue() {
    if (!confirm('确定要清空抓取队列吗？')) {
        return;
    }
    
    fetch(`${API_BASE_URL}/crawl/queue`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('清空队列失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(data.message, 'success');
            updateCrawlStatus();
        } else {
            showMessage(data.message, 'warning');
        }
    })
    .catch(error => {
        showMessage('清空队列失败: ' + error.message, 'danger');
    });
}

// 更新抓取状态
function updateCrawlStatus() {
    fetch(`${API_BASE_URL}/crawl/status`)
    .then(response => {
        if (!response.ok) {
            throw new Error('获取抓取状态失败');
        }
        return response.json();
    })
    .then(status => {
        // 更新状态显示
        crawlStatus.text(status.isCrawling ? '运行中' : '未运行');
        crawlStatus.parent().parent().removeClass('bg-light').addClass(status.isCrawling ? 'bg-success text-white' : 'bg-light');
        
        queueSize.text(status.queueSize);
        processedCount.text(status.processedCount);
        crawlMessage.text(status.isCrawling ? '正在抓取数据...' : '准备就绪');
    })
    .catch(error => {
        console.error('更新抓取状态失败:', error);
        crawlMessage.text('获取状态失败');
    });
}