/**
 * 前端API服务
 * 用于调用后端API，实现前后端分离
 */

class ApiService {
    constructor() {
        // API基础URL - 从环境变量或全局配置读取，默认为truebody.zeabur.app/api
        let apiBaseUrl = 'http://121.41.109.106:3000/api';
        
        // 检查是否有全局配置
        if (window && window.appConfig && window.appConfig.apiUrl) {
            apiBaseUrl = `${window.appConfig.apiUrl}/api`;
        }
        // 检查是否有环境变量（如果使用构建工具）
        else if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
            apiBaseUrl = `${import.meta.env.VITE_API_URL}/api`;
        }
        
        this.apiBaseUrl = apiBaseUrl;
    }

    // 发送请求的通用方法
    async sendRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw new Error('网络请求失败，请检查网络连接或后端服务是否正常运行');
        }
    }

    // 搜索名片
    async search(keyword, category = '') {
        let url = `/search?keyword=${encodeURIComponent(keyword)}`;
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }
        return this.sendRequest(url);
    }

    // 获取单张名片
    async getById(id) {
        return this.sendRequest(`/card/${id}`);
    }

    // 提交错误报告
    async submitReport(reportData) {
        return this.sendRequest('/report', {
            method: 'POST',
            body: JSON.stringify(reportData)
        });
    }
}

// 导出API服务实例
const apiService = new ApiService();
if (typeof window !== 'undefined') {
    window.apiService = apiService;
}

// 用于测试的函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
}