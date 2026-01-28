// API模拟层
// 模拟后端接口，实现前后端数据分离

class ApiService {
    constructor() {
        // 模拟数据库中的数据
        this.data = [
            {
                id: 1,
                name: "Steam",
                website: "https://store.steampowered.com/",
                phone: ["+1 425-889-9642"],
                email: ["support@steampowered.com"],
                address: "美国华盛顿州贝尔维尤市10400 NE 4th St",
                qrCode: null
            },
            {
                id: 2,
                name: "Microsoft",
                website: "https://www.microsoft.com/",
                phone: ["+1 800-642-7676", "+86 400-820-3800"],
                email: ["contact@microsoft.com"],
                address: "美国华盛顿州雷德蒙德市One Microsoft Way",
                qrCode: null
            },
            {
                id: 3,
                name: "Apple",
                website: "https://www.apple.com/",
                phone: ["+1 800-275-2273", "+86 400-666-8800"],
                email: [],
                address: "美国加利福尼亚州库比蒂诺市One Apple Park Way",
                qrCode: null
            },
            {
                id: 4,
                name: "Google",
                website: "https://www.google.com/",
                phone: [],
                email: ["support@google.com"],
                address: "美国加利福尼亚州山景城1600 Amphitheatre Parkway",
                qrCode: null
            },
            {
                id: 5,
                name: "腾讯",
                website: "https://www.tencent.com/zh-cn.html",
                phone: ["+86 755-86013388"],
                email: ["ir@tencent.com"],
                address: "中国广东省深圳市南山区海天二路33号腾讯滨海大厦",
                qrCode: null
            },
            {
                id: 6,
                name: "阿里巴巴",
                website: "https://www.alibaba.com/",
                phone: ["+86 571-85022088"],
                email: [],
                address: "中国浙江省杭州市余杭区文一西路969号",
                qrCode: null
            },
            {
                id: 7,
                name: "阿里曼巴",
                website: "https://www.alimanba.com/",
                phone: ["+86 571-85022088"],
                email: [],
                address: "中国浙江省杭州市余杭区文一西路969号",
                qrCode: null
            }
        ];
    }

    // 模拟API延迟
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 搜索名片
    async search(keyword) {
        await this.delay(300); // 模拟网络延迟
        
        if (!keyword) {
            return [];
        }

        const lowerKeyword = keyword.toLowerCase();
        return this.data.filter(item => 
            item.name.toLowerCase().includes(lowerKeyword) ||
            (item.website && item.website.toLowerCase().includes(lowerKeyword))
        );
    }

    // 获取单张名片
    async getById(id) {
        await this.delay(200);
        return this.data.find(item => item.id === parseInt(id));
    }

    // 提交错误报告
    async submitReport(reportData) {
        await this.delay(400);
        console.log('收到错误报告:', reportData);
        return { success: true, message: '报告提交成功' };
    }

    // 获取所有名片（用于测试）
    async getAll() {
        await this.delay(300);
        return this.data;
    }
}

// 导出API服务实例
const apiService = new ApiService();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
} else {
    window.apiService = apiService;
}