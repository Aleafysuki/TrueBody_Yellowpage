-- 添加缺失的分类列

-- 检查并添加CategoryLevel1列
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'CategoryLevel1' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    ALTER TABLE TestTable
    ADD CategoryLevel1 NVARCHAR(100) NULL;
    PRINT 'Added CategoryLevel1 column';
END
ELSE
BEGIN
    PRINT 'CategoryLevel1 column already exists';
END

-- 检查并添加CategoryLevel2列
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'CategoryLevel2' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    ALTER TABLE TestTable
    ADD CategoryLevel2 NVARCHAR(100) NULL;
    PRINT 'Added CategoryLevel2 column';
END
ELSE
BEGIN
    PRINT 'CategoryLevel2 column already exists';
END

-- 检查并添加CategoryLevel3列
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'CategoryLevel3' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    ALTER TABLE TestTable
    ADD CategoryLevel3 NVARCHAR(100) NULL;
    PRINT 'Added CategoryLevel3 column';
END
ELSE
BEGIN
    PRINT 'CategoryLevel3 column already exists';
END

-- 检查并添加CategoryPath列
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'CategoryPath' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    ALTER TABLE TestTable
    ADD CategoryPath NVARCHAR(255) NULL;
    PRINT 'Added CategoryPath column';
END
ELSE
BEGIN
    PRINT 'CategoryPath column already exists';
END

-- 创建索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestTable_CategoryLevel1' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    CREATE INDEX IX_TestTable_CategoryLevel1 ON TestTable(CategoryLevel1);
    PRINT 'Created IX_TestTable_CategoryLevel1 index';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestTable_CategoryLevel2' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    CREATE INDEX IX_TestTable_CategoryLevel2 ON TestTable(CategoryLevel2);
    PRINT 'Created IX_TestTable_CategoryLevel2 index';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestTable_CategoryLevel3' AND object_id = OBJECT_ID('TestTable'))
BEGIN
    CREATE INDEX IX_TestTable_CategoryLevel3 ON TestTable(CategoryLevel3);
    PRINT 'Created IX_TestTable_CategoryLevel3 index';
END
