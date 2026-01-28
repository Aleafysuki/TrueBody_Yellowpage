-- 更新数据库表结构，添加3级分类支持

-- 1. 创建分类管理表
CREATE TABLE CategoryTable (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
    ParentID INT NULL,
    Level INT NOT NULL,
    CategoryCode NVARCHAR(50) NOT NULL,
    Description NVARCHAR(255) NULL,
    CreateTime DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ParentID) REFERENCES CategoryTable(CategoryID)
);

-- 2. 修改TestTable表，添加分类字段
ALTER TABLE TestTable
ADD CategoryLevel1 NVARCHAR(100) NULL,
    CategoryLevel2 NVARCHAR(100) NULL,
    CategoryLevel3 NVARCHAR(100) NULL,
    CategoryPath NVARCHAR(255) NULL;

-- 3. 创建分类索引
CREATE INDEX IX_TestTable_CategoryLevel1 ON TestTable(CategoryLevel1);
CREATE INDEX IX_TestTable_CategoryLevel2 ON TestTable(CategoryLevel2);
CREATE INDEX IX_TestTable_CategoryLevel3 ON TestTable(CategoryLevel3);
CREATE INDEX IX_CategoryTable_ParentID ON CategoryTable(ParentID);
CREATE INDEX IX_CategoryTable_Level ON CategoryTable(Level);

-- 4. 添加分类示例数据
-- 一级分类
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('科技', NULL, 1, 'TECH', '科技相关行业'),
('金融', NULL, 1, 'FIN', '金融相关行业'),
('医疗', NULL, 1, 'MED', '医疗相关行业'),
('教育', NULL, 1, 'EDU', '教育相关行业'),
('零售', NULL, 1, 'RET', '零售相关行业');

-- 二级分类（科技）
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('软件', 1, 2, 'TECH_SOFT', '软件相关企业'),
('硬件', 1, 2, 'TECH_HARD', '硬件相关企业'),
('互联网', 1, 2, 'TECH_INET', '互联网相关企业');

-- 二级分类（金融）
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('银行', 2, 2, 'FIN_BANK', '银行相关企业'),
('保险', 2, 2, 'FIN_INS', '保险相关企业'),
('投资', 2, 2, 'FIN_INV', '投资相关企业');

-- 三级分类（软件）
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('操作系统', 6, 3, 'TECH_SOFT_OS', '操作系统软件企业'),
('办公软件', 6, 3, 'TECH_SOFT_OFFICE', '办公软件企业'),
('开发工具', 6, 3, 'TECH_SOFT_DEV', '开发工具软件企业');

-- 三级分类（硬件）
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('计算机', 7, 3, 'TECH_HARD_COMP', '计算机硬件企业'),
('手机', 7, 3, 'TECH_HARD_PHONE', '手机硬件企业'),
('网络设备', 7, 3, 'TECH_HARD_NET', '网络设备企业');

-- 三级分类（互联网）
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('电商', 8, 3, 'TECH_INET_ECOM', '电子商务企业'),
('社交', 8, 3, 'TECH_INET_SOCIAL', '社交网络企业'),
('搜索', 8, 3, 'TECH_INET_SEARCH', '搜索引擎企业');

-- 三级分类（银行）
INSERT INTO CategoryTable (CategoryName, ParentID, Level, CategoryCode, Description)
VALUES 
('国有银行', 9, 3, 'FIN_BANK_STATE', '国有银行'),
('商业银行', 9, 3, 'FIN_BANK_COMM', '商业银行'),
('外资银行', 9, 3, 'FIN_BANK_FOREIGN', '外资银行');

-- 5. 更新现有数据的分类字段（将原Category字段值映射到一级分类）
UPDATE TestTable
SET CategoryLevel1 = Category
WHERE Category IS NOT NULL;
