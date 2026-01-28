/**
 * 后端服务 - 连接SQL Server数据库
 * 使用Node.js + Express + mssql
 * 注意：此文件需要在Node.js环境中运行，不能在浏览器中直接使用
 */

// 引入所需模块
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // 加载环境变量
const express = require('express');
const mssql = require('mssql');
const cors = require('cors');
const https = require('https');
const url = require('url');

// 数据抓取状态管理
let isCrawling = false;
let crawlQueue = [];
let processedUrls = new Set();

// 创建Express应用
const app = express();
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体

// 配置静态文件服务，提供前端文件访问
app.use(express.static(path.join(__dirname, '../frontend')));

// 数据库配置 - 使用环境变量
const DB_CONFIG = {
    server: process.env.DB_SERVER, // 数据库服务器地址
    database: process.env.DB_DATABASE, // 数据库名称
    user: process.env.DB_USER, // 数据库用户名
    password: process.env.DB_PASSWORD, // 数据库密码
    options: {
        encrypt: true, // 阿里云SQL Server需要加密连接
        trustServerCertificate: true, // 不建议信任服务器证书
        port: parseInt(process.env.DB_PORT) || 1433 // SQL Server默认端口
    }
};

// 简单的HTML解析函数 - 从网页中提取企业信息
function parseHTML(html, url) {
    try {
        // 提取标题
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const name = titleMatch ? titleMatch[1].trim() : url.hostname;
        
        // 提取描述
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
        const description = descMatch ? descMatch[1].trim() : '';
        
        // 提取电话
        const phoneMatch = html.match(/((?:\d{3,4}-)?\d{7,8})/g);
        const phone = phoneMatch ? [...new Set(phoneMatch)] : [];
        
        // 提取邮箱
        const emailMatch = html.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g);
        const email = emailMatch ? [...new Set(emailMatch)] : [];
        
        // 提取地址
        const addressMatch = html.match(/<address[^>]*>([\s\S]*?)<\/address>/i);
        let address = addressMatch ? addressMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        
        if (!address) {
            const addressMatch2 = html.match(/地址[:：]\s*([^\n]+)/i);
            if (addressMatch2) address = addressMatch2[1].trim();
        }
        
        return {
            name,
            description,
            website: url.href,
            phone,
            email,
            address,
            category: '未分类',
            source: url.href,
            status: 'pending' // 待审核状态
        };
    } catch (error) {
        console.error('解析HTML失败:', error);
        return null;
    }
}

// 检查是否为重复条目
async function isDuplicateEntry(data) {
    try {
        const pool = await poolPromise;
        
        // 检查网站或名称是否已存在
        const query = `
            SELECT COUNT(*) AS Count
            FROM TestTable
            WHERE Website = @website OR Name = @name
        `;
        
        const result = await pool.request()
            .input('website', mssql.NVarChar, data.website)
            .input('name', mssql.NVarChar, data.name)
            .query(query);
        
        return result.recordset[0].Count > 0;
    } catch (error) {
        console.error('检查重复条目失败:', error);
        return true; // 出错时默认认为是重复条目，避免重复抓取
    }
}

// 保存抓取的数据到待审核表
async function savePendingEntry(data) {
    try {
        const pool = await poolPromise;
        
        // 检查是否已存在
        if (await isDuplicateEntry(data)) {
            return { success: false, message: '条目已存在' };
        }
        
        // 查询最大ID
        const maxIdQuery = 'SELECT ISNULL(MAX(ID), 0) AS MaxID FROM TestTable';
        const maxIdResult = await pool.request().query(maxIdQuery);
        const newId = maxIdResult.recordset[0].MaxID + 1;
        
        // 插入新记录
        const insertQuery = `
            INSERT INTO TestTable (ID, Name, Description, Website, Tel, Email, Address, Category)
            VALUES (@id, @name, @description, @website, @tel, @email, @address, @category)
        `;
        
        await pool.request()
            .input('id', mssql.Int, newId)
            .input('name', mssql.NVarChar, data.name)
            .input('description', mssql.NVarChar, data.description || null)
            .input('website', mssql.NVarChar, data.website)
            .input('tel', mssql.NVarChar, data.phone && data.phone.length > 0 ? data.phone.join(';') : null)
            .input('email', mssql.NVarChar, data.email && data.email.length > 0 ? data.email.join(';') : null)
            .input('address', mssql.NVarChar, data.address || null)
            .input('category', mssql.NVarChar, data.category || '未分类')
            .query(insertQuery);
        
        return { success: true, message: '条目已保存到待审核表' };
    } catch (error) {
        console.error('保存待审核条目失败:', error);
        return { success: false, message: '保存失败: ' + error.message };
    }
}

// 抓取单个URL
async function crawlURL(urlToCrawl) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = url.parse(urlToCrawl);
            
            // 只处理HTTPS请求
            if (parsedUrl.protocol !== 'https:') {
                resolve({ success: false, message: '只支持HTTPS URL' });
                return;
            }
            
            // 检查是否已处理过
            if (processedUrls.has(urlToCrawl)) {
                resolve({ success: false, message: 'URL已处理过' });
                return;
            }
            
            processedUrls.add(urlToCrawl);
            
            // 发送请求
            const request = https.get(urlToCrawl, (response) => {
                let html = '';
                
                response.on('data', (chunk) => {
                    html += chunk;
                });
                
                response.on('end', async () => {
                    try {
                        // 解析HTML
                        const data = parseHTML(html, parsedUrl);
                        if (data) {
                            // 保存到数据库
                            const result = await savePendingEntry(data);
                            resolve(result);
                        } else {
                            resolve({ success: false, message: '解析失败' });
                        }
                    } catch (error) {
                        resolve({ success: false, message: '处理失败: ' + error.message });
                    }
                });
            });
            
            request.on('error', (error) => {
                resolve({ success: false, message: '请求失败: ' + error.message });
            });
            
            // 设置超时
            request.setTimeout(10000, () => {
                request.destroy();
                resolve({ success: false, message: '请求超时' });
            });
            
        } catch (error) {
            resolve({ success: false, message: '抓取失败: ' + error.message });
        }
    });
}

// 启动抓取任务
async function startCrawling() {
    if (isCrawling) {
        return { success: false, message: '抓取任务已在运行' };
    }
    
    isCrawling = true;
    
    console.log('开始抓取任务');
    
    while (crawlQueue.length > 0 && isCrawling) {
        const urlToCrawl = crawlQueue.shift();
        console.log(`抓取: ${urlToCrawl}`);
        
        try {
            await crawlURL(urlToCrawl);
        } catch (error) {
            console.error(`抓取 ${urlToCrawl} 失败:`, error);
        }
        
        // 延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    isCrawling = false;
    console.log('抓取任务结束');
    
    return { success: true, message: '抓取任务已完成' };
}

// 停止抓取任务
function stopCrawling() {
    isCrawling = false;
    return { success: true, message: '抓取任务已停止' };
}

// 内存中的分类树结构
const categoryTree = [
    {
        id: 1,
        name: '科技',
        level: 1,
        code: 'TECH',
        description: '科技相关行业',
        children: [
            {
                id: 6,
                name: '软件',
                level: 2,
                code: 'TECH_SOFT',
                description: '软件相关企业',
                children: [
                    {
                        id: 12,
                        name: '操作系统',
                        level: 3,
                        code: 'TECH_SOFT_OS',
                        description: '操作系统软件企业'
                    },
                    {
                        id: 13,
                        name: '办公软件',
                        level: 3,
                        code: 'TECH_SOFT_OFFICE',
                        description: '办公软件企业'
                    },
                    {
                        id: 14,
                        name: '开发工具',
                        level: 3,
                        code: 'TECH_SOFT_DEV',
                        description: '开发工具软件企业'
                    }
                ]
            },
            {
                id: 7,
                name: '硬件',
                level: 2,
                code: 'TECH_HARD',
                description: '硬件相关企业',
                children: [
                    {
                        id: 15,
                        name: '计算机',
                        level: 3,
                        code: 'TECH_HARD_COMP',
                        description: '计算机硬件企业'
                    },
                    {
                        id: 16,
                        name: '手机',
                        level: 3,
                        code: 'TECH_HARD_PHONE',
                        description: '手机硬件企业'
                    },
                    {
                        id: 17,
                        name: '网络设备',
                        level: 3,
                        code: 'TECH_HARD_NET',
                        description: '网络设备企业'
                    }
                ]
            },
            {
                id: 8,
                name: '互联网',
                level: 2,
                code: 'TECH_INET',
                description: '互联网相关企业',
                children: [
                    {
                        id: 18,
                        name: '电商',
                        level: 3,
                        code: 'TECH_INET_ECOM',
                        description: '电子商务企业'
                    },
                    {
                        id: 19,
                        name: '社交',
                        level: 3,
                        code: 'TECH_INET_SOCIAL',
                        description: '社交网络企业'
                    },
                    {
                        id: 20,
                        name: '搜索',
                        level: 3,
                        code: 'TECH_INET_SEARCH',
                        description: '搜索引擎企业'
                    }
                ]
            }
        ]
    },
    {
        id: 2,
        name: '金融',
        level: 1,
        code: 'FIN',
        description: '金融相关行业',
        children: [
            {
                id: 9,
                name: '银行',
                level: 2,
                code: 'FIN_BANK',
                description: '银行相关企业',
                children: [
                    {
                        id: 21,
                        name: '国有银行',
                        level: 3,
                        code: 'FIN_BANK_STATE',
                        description: '国有银行'
                    },
                    {
                        id: 22,
                        name: '商业银行',
                        level: 3,
                        code: 'FIN_BANK_COMM',
                        description: '商业银行'
                    },
                    {
                        id: 23,
                        name: '外资银行',
                        level: 3,
                        code: 'FIN_BANK_FOREIGN',
                        description: '外资银行'
                    }
                ]
            },
            {
                id: 10,
                name: '保险',
                level: 2,
                code: 'FIN_INS',
                description: '保险相关企业',
                children: []
            },
            {
                id: 11,
                name: '投资',
                level: 2,
                code: 'FIN_INV',
                description: '投资相关企业',
                children: []
            }
        ]
    },
    {
        id: 3,
        name: '医疗',
        level: 1,
        code: 'MED',
        description: '医疗相关行业',
        children: []
    },
    {
        id: 4,
        name: '教育',
        level: 1,
        code: 'EDU',
        description: '教育相关行业',
        children: []
    },
    {
        id: 5,
        name: '零售',
        level: 1,
        code: 'RET',
        description: '零售相关行业',
        children: []
    }
];

// 创建数据库连接池
const poolPromise = new mssql.ConnectionPool(DB_CONFIG)
    .connect()
    .then(pool => {
        console.log('已连接到SQL Server数据库');
        return pool;
    })
    .catch(err => {
        console.error('数据库连接失败:', err);
        process.exit(1);
    });

// 搜索API端点
app.get('/api/search', async (req, res) => {
    const keyword = req.query.keyword || '';
    const categoryLevel1 = req.query.categoryLevel1 || '';
    const categoryLevel2 = req.query.categoryLevel2 || '';
    const categoryLevel3 = req.query.categoryLevel3 || '';
    
    try {
        const pool = await poolPromise;
        
        // 构建查询语句
        const query = `
            SELECT 
                ID, 
                Name, 
                Description, 
                Website, 
                Tel, 
                Email, 
                Address, 
                QRCode,
                Category,
                LastUpdated
            FROM 
                TestTable
            WHERE 
                (Name LIKE @keyword OR 
                Description LIKE @keyword OR
                Website LIKE @keyword OR
                Address LIKE @keyword OR
                Category LIKE @keyword OR
                SearchKeywords LIKE @keyword)
            ORDER BY 
                ID
        `;
        
        // 执行查询
        const result = await pool.request()
            .input('keyword', mssql.NVarChar, `%${keyword}%`)
            .query(query);
        
        // 处理结果
        const records = result.recordset.map(record => ({
            id: record.ID,
            name: record.Name,
            description: record.Description || null,
            website: record.Website || null,
            phone: record.Tel ? [record.Tel] : [],
            email: record.Email ? [record.Email] : [],
            address: record.Address || null,
            qrCode: record.QRCode || null,
            category: record.Category || '未分类',
            categoryLevel1: null,
            categoryLevel2: null,
            categoryLevel3: null,
            categoryPath: null,
            lastUpdated: record.LastUpdated ? new Date(record.LastUpdated).toISOString() : null
        }));
        
        // 如果提供了分类过滤，在内存中进行过滤
        let filteredRecords = records;
        if (categoryLevel1 || categoryLevel2 || categoryLevel3) {
            filteredRecords = records.filter(record => {
                // 这里可以根据需要实现分类过滤逻辑
                // 由于我们没有实际的分类列，暂时返回所有记录
                return true;
            });
        }
        
        res.json(filteredRecords);
    } catch (error) {
        console.error('搜索请求处理失败:', error);
        res.status(500).json({ error: '搜索失败，请稍后重试' });
    }
});

// 获取单个名片API端点
app.get('/api/card/:id', async (req, res) => {
    const id = req.params.id;
    
    try {
        const pool = await poolPromise;
        
        const query = `
            SELECT 
                ID, 
                Name, 
                Description,
                Website, 
                Tel, 
                Email, 
                Address, 
                QRCode,
                Category
            FROM 
                TestTable
            WHERE 
                ID = @id
        `;
        
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: '未找到指定名片' });
        }
        
        const record = result.recordset[0];
        const card = {
            id: record.ID,
            name: record.Name,
            website: record.Website || null,
            phone: record.Tel ? [record.Tel] : [],
            email: record.Email ? [record.Email] : [],
            address: record.Address || null,
            qrCode: record.QRCode || null,
            category: record.Category || '未分类',
            categoryLevel1: null,
            categoryLevel2: null,
            categoryLevel3: null,
            categoryPath: null
        };
        
        res.json(card);
    } catch (error) {
        console.error('获取名片请求处理失败:', error);
        res.status(500).json({ error: '获取名片失败，请稍后重试' });
    }
});

// 错误上报API端点
app.post('/api/report', async (req, res) => {
    const { id, content } = req.body;
    
    if (!id || !content) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    try {
        const pool = await poolPromise;
        
        // 插入错误反馈记录
        const insertQuery = `
            INSERT INTO ErrorFeedback (CardID, Content)
            VALUES (@cardId, @content)
        `;
        
        await pool.request()
            .input('cardId', mssql.Int, id)
            .input('content', mssql.NVarChar, content)
            .query(insertQuery);
        
        console.log('错误上报:', {
            id,
            content,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: '报告提交成功' });
    } catch (error) {
        console.error('错误上报处理失败:', error);
        res.status(500).json({ error: '报告提交失败，请稍后重试' });
    }
});

// 获取所有错误反馈（管理界面用）
app.get('/api/admin/feedback', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const query = `
            SELECT 
                f.FeedbackID,
                f.CardID,
                t.Name as CardName,
                f.Content,
                f.SubmittedAt,
                f.Status,
                f.ProcessedBy,
                f.ProcessedAt,
                f.Resolution
            FROM 
                ErrorFeedback f
            LEFT JOIN 
                TestTable t ON f.CardID = t.ID
            ORDER BY 
                f.SubmittedAt DESC
        `;
        
        const result = await pool.request().query(query);
        
        const feedbacks = result.recordset.map(record => ({
            id: record.FeedbackID,
            cardId: record.CardID,
            cardName: record.CardName,
            content: record.Content,
            submittedAt: record.SubmittedAt ? new Date(record.SubmittedAt).toISOString() : null,
            status: record.Status,
            processedBy: record.ProcessedBy,
            processedAt: record.ProcessedAt ? new Date(record.ProcessedAt).toISOString() : null,
            resolution: record.Resolution
        }));
        
        res.json(feedbacks);
    } catch (error) {
        console.error('获取错误反馈失败:', error);
        res.status(500).json({ error: '获取错误反馈失败，请稍后重试' });
    }
});

// 处理错误反馈（管理界面用）
app.put('/api/admin/feedback/:id', async (req, res) => {
    const id = req.params.id;
    const { status, processedBy, resolution } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: '状态不能为空' });
    }
    
    try {
        const pool = await poolPromise;
        
        const query = `
            UPDATE ErrorFeedback
            SET 
                Status = @status,
                ProcessedBy = @processedBy,
                ProcessedAt = GETDATE(),
                Resolution = @resolution
            WHERE 
                FeedbackID = @id
        `;
        
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .input('status', mssql.NVarChar, status)
            .input('processedBy', mssql.NVarChar, processedBy || null)
            .input('resolution', mssql.NVarChar, resolution || null)
            .query(query);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: '未找到指定反馈' });
        }
        
        res.json({ success: true, message: '反馈处理成功' });
    } catch (error) {
        console.error('处理错误反馈失败:', error);
        res.status(500).json({ error: '处理错误反馈失败，请稍后重试' });
    }
});

// 获取分类树结构API端点
app.get('/api/categories', async (req, res) => {
    try {
        // 直接返回内存中的分类树
        res.json(categoryTree);
    } catch (error) {
        console.error('获取分类树失败:', error);
        res.status(500).json({ error: '获取分类树失败，请稍后重试' });
    }
});

// ========== 管理界面API ==========

// 获取所有名片（管理界面用）
app.get('/api/admin/cards', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const query = `
            SELECT 
                ID, 
                Name, 
                Description, 
                Website, 
                Tel, 
                Email, 
                Address, 
                QRCode,
                Category,
                SearchKeywords,
                LastUpdated
            FROM 
                TestTable
            ORDER BY 
                ID
        `;
        
        const result = await pool.request().query(query);
        
        const records = result.recordset.map(record => ({
            id: record.ID,
            name: record.Name,
            description: record.Description || null,
            website: record.Website || null,
            phone: record.Tel ? [record.Tel] : [],
            email: record.Email ? [record.Email] : [],
            address: record.Address || null,
            qrCode: record.QRCode || null,
            category: record.Category || '',
            searchKeywords: record.SearchKeywords || null,
            lastUpdated: record.LastUpdated ? new Date(record.LastUpdated).toISOString() : null
        }));
        
        res.json(records);
    } catch (error) {
        console.error('获取所有名片失败:', error);
        res.status(500).json({ error: '获取所有名片失败，请稍后重试' });
    }
});

// 添加新名片（管理界面用）
app.post('/api/admin/cards', async (req, res) => {
    const { name, description, website, phone, email, address, qrCode, category, searchKeywords, categoryLevel1, categoryLevel2, categoryLevel3 } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '名称不能为空' });
    }
    
    try {
        const pool = await poolPromise;
        
        // 查询最大ID
        const maxIdQuery = 'SELECT ISNULL(MAX(ID), 0) AS MaxID FROM TestTable';
        const maxIdResult = await pool.request().query(maxIdQuery);
        const newId = maxIdResult.recordset[0].MaxID + 1;
        
        // 构建分类路径
        let categoryPath = null;
        if (categoryLevel1) {
            categoryPath = categoryLevel1;
            if (categoryLevel2) {
                categoryPath += ' > ' + categoryLevel2;
                if (categoryLevel3) {
                    categoryPath += ' > ' + categoryLevel3;
                }
            }
        }
        
        // 插入新记录
        const insertQuery = `
            INSERT INTO TestTable (ID, Name, Description, Website, Tel, Email, Address, QRCode, Category, SearchKeywords, CategoryLevel1, CategoryLevel2, CategoryLevel3, CategoryPath, LastUpdated)
            VALUES (@id, @name, @description, @website, @tel, @email, @address, @qrCode, @category, @searchKeywords, @categoryLevel1, @categoryLevel2, @categoryLevel3, @categoryPath, GETDATE())
        `;
        
        await pool.request()
            .input('id', mssql.Int, newId)
            .input('name', mssql.NVarChar, name)
            .input('description', mssql.NVarChar, description || null)
            .input('website', mssql.NVarChar, website || null)
            .input('tel', mssql.NVarChar, phone && phone.length > 0 ? phone[0] : null)
            .input('email', mssql.NVarChar, email && email.length > 0 ? email[0] : null)
            .input('address', mssql.NVarChar, address || null)
            .input('qrCode', mssql.NVarChar, qrCode || null)
            .input('category', mssql.NVarChar, category || null)
            .input('searchKeywords', mssql.NVarChar, searchKeywords || null)
            .input('categoryLevel1', mssql.NVarChar, categoryLevel1 || null)
            .input('categoryLevel2', mssql.NVarChar, categoryLevel2 || null)
            .input('categoryLevel3', mssql.NVarChar, categoryLevel3 || null)
            .input('categoryPath', mssql.NVarChar, categoryPath || null)
            .query(insertQuery);
        
        res.json({ success: true, message: '名片添加成功' });
    } catch (error) {
        console.error('添加名片失败:', error);
        res.status(500).json({ error: '添加名片失败，请稍后重试' });
    }
});

// 获取单个名片（管理界面用）
app.get('/api/admin/cards/:id', async (req, res) => {
    const id = req.params.id;
    
    try {
        const pool = await poolPromise;
        
        const query = `
            SELECT 
                ID, 
                Name, 
                Description, 
                Website, 
                Tel, 
                Email, 
                Address, 
                QRCode,
                Category,
                SearchKeywords,
                LastUpdated
            FROM 
                TestTable
            WHERE
                ID = @id
        `;
        
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: '名片不存在' });
        }
        
        const record = result.recordset[0];
        const card = {
            id: record.ID,
            name: record.Name,
            description: record.Description || null,
            website: record.Website || null,
            phone: record.Tel ? [record.Tel] : [],
            email: record.Email ? [record.Email] : [],
            address: record.Address || null,
            qrCode: record.QRCode || null,
            category: record.Category || '',
            searchKeywords: record.SearchKeywords || null,
            lastUpdated: record.LastUpdated ? new Date(record.LastUpdated).toISOString() : null
        };
        
        res.json(card);
    } catch (error) {
        console.error('获取单个名片失败:', error);
        res.status(500).json({ error: '获取单个名片失败，请稍后重试' });
    }
});

// 更新名片（管理界面用）
app.put('/api/admin/cards/:id', async (req, res) => {
    const id = req.params.id;
    const { name, description, website, phone, email, address, qrCode, category, searchKeywords } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: '名称不能为空' });
    }
    
    try {
        const pool = await poolPromise;
        
        const query = `
            UPDATE TestTable
            SET 
                Name = @name,
                Description = @description,
                Website = @website,
                Tel = @tel,
                Email = @email,
                Address = @address,
                QRCode = @qrCode,
                Category = @category,
                SearchKeywords = @searchKeywords,
                LastUpdated = GETDATE()
            WHERE 
                ID = @id
        `;
        
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .input('name', mssql.NVarChar, name)
            .input('description', mssql.NVarChar, description || null)
            .input('website', mssql.NVarChar, website || null)
            .input('tel', mssql.NVarChar, phone && phone.length > 0 ? phone[0] : null)
            .input('email', mssql.NVarChar, email && email.length > 0 ? email[0] : null)
            .input('address', mssql.NVarChar, address || null)
            .input('qrCode', mssql.NVarChar, qrCode || null)
            .input('category', mssql.NVarChar, category || null)
            .input('searchKeywords', mssql.NVarChar, searchKeywords || null)
            .query(query);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: '未找到指定名片' });
        }
        
        res.json({ success: true, message: '名片更新成功' });
    } catch (error) {
        console.error('更新名片失败:', error);
        res.status(500).json({ error: '更新名片失败，请稍后重试' });
    }
});

// 删除名片（管理界面用）
app.delete('/api/admin/cards/:id', async (req, res) => {
    const id = req.params.id;
    
    try {
        const pool = await poolPromise;
        
        const query = `DELETE FROM TestTable WHERE ID = @id`;
        
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query(query);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: '未找到指定名片' });
        }
        
        res.json({ success: true, message: '名片删除成功' });
    } catch (error) {
        console.error('删除名片失败:', error);
        res.status(500).json({ error: '删除名片失败，请稍后重试' });
    }
});

// 获取所有分类（管理界面用）
app.get('/api/admin/categories', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const query = `
            SELECT DISTINCT Category
            FROM TestTable
            WHERE Category IS NOT NULL AND Category != ''
            ORDER BY Category
        `;
        
        const result = await pool.request().query(query);
        
        const categories = result.recordset.map(record => record.Category);
        
        res.json(categories);
    } catch (error) {
        console.error('获取分类失败:', error);
        res.status(500).json({ error: '获取分类失败，请稍后重试' });
    }
});

// ========== 数据抓取API（管理界面用） ==========

// 添加URL到抓取队列
app.post('/api/admin/crawl/queue', (req, res) => {
    try {
        const { urls } = req.body;
        
        if (!urls || !Array.isArray(urls)) {
            return res.status(400).json({ error: '请提供URL数组' });
        }
        
        // 添加到队列（去重）
        const newUrls = urls.filter(url => !crawlQueue.includes(url) && !processedUrls.has(url));
        crawlQueue = [...crawlQueue, ...newUrls];
        
        res.json({
            success: true,
            message: `已添加 ${newUrls.length} 个URL到抓取队列`,
            queueSize: crawlQueue.length
        });
    } catch (error) {
        console.error('添加URL到抓取队列失败:', error);
        res.status(500).json({ error: '添加失败，请稍后重试' });
    }
});

// 启动抓取任务
app.post('/api/admin/crawl/start', async (req, res) => {
    try {
        if (isCrawling) {
            return res.json({ success: false, message: '抓取任务已在运行' });
        }
        
        // 如果队列为空，可以添加一些默认URL
        if (crawlQueue.length === 0) {
            // 可以根据需求添加默认URL
        }
        
        // 异步启动抓取任务
        startCrawling();
        
        res.json({
            success: true,
            message: '抓取任务已启动',
            queueSize: crawlQueue.length
        });
    } catch (error) {
        console.error('启动抓取任务失败:', error);
        res.status(500).json({ error: '启动失败，请稍后重试' });
    }
});

// 停止抓取任务
app.post('/api/admin/crawl/stop', (req, res) => {
    try {
        const result = stopCrawling();
        res.json(result);
    } catch (error) {
        console.error('停止抓取任务失败:', error);
        res.status(500).json({ error: '停止失败，请稍后重试' });
    }
});

// 获取抓取状态
app.get('/api/admin/crawl/status', (req, res) => {
    try {
        res.json({
            isCrawling,
            queueSize: crawlQueue.length,
            processedCount: processedUrls.size
        });
    } catch (error) {
        console.error('获取抓取状态失败:', error);
        res.status(500).json({ error: '获取状态失败，请稍后重试' });
    }
});

// 清空抓取队列
app.delete('/api/admin/crawl/queue', (req, res) => {
    try {
        crawlQueue = [];
        res.json({
            success: true,
            message: '抓取队列已清空',
            queueSize: crawlQueue.length
        });
    } catch (error) {
        console.error('清空抓取队列失败:', error);
        res.status(500).json({ error: '清空失败，请稍后重试' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`后端服务已启动，监听端口 ${PORT}`);
    console.log(`API文档:`);
    console.log(`- 搜索: GET http://localhost:${PORT}/api/search?keyword=xxx`);
    console.log(`- 获取单张名片: GET http://localhost:${PORT}/api/card/xxx`);
    console.log(`- 错误上报: POST http://localhost:${PORT}/api/report`);
});