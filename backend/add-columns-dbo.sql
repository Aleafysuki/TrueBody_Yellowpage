-- 使用完整表名添加分类列

ALTER TABLE dbo.TestTable ADD CategoryLevel1 NVARCHAR(100) NULL;
ALTER TABLE dbo.TestTable ADD CategoryLevel2 NVARCHAR(100) NULL;
ALTER TABLE dbo.TestTable ADD CategoryLevel3 NVARCHAR(100) NULL;
ALTER TABLE dbo.TestTable ADD CategoryPath NVARCHAR(255) NULL;
