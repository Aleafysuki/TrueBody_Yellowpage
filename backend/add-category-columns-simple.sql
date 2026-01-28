-- 直接添加分类列

-- 添加CategoryLevel1列
ALTER TABLE TestTable ADD CategoryLevel1 NVARCHAR(100) NULL;

-- 添加CategoryLevel2列
ALTER TABLE TestTable ADD CategoryLevel2 NVARCHAR(100) NULL;

-- 添加CategoryLevel3列
ALTER TABLE TestTable ADD CategoryLevel3 NVARCHAR(100) NULL;

-- 添加CategoryPath列
ALTER TABLE TestTable ADD CategoryPath NVARCHAR(255) NULL;

-- 创建索引
CREATE INDEX IX_TestTable_CategoryLevel1 ON TestTable(CategoryLevel1);
CREATE INDEX IX_TestTable_CategoryLevel2 ON TestTable(CategoryLevel2);
CREATE INDEX IX_TestTable_CategoryLevel3 ON TestTable(CategoryLevel3);
