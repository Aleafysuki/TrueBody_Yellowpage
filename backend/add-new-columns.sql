-- 向TestTable表添加新字段的SQL脚本

-- 添加SearchKeywords字段（用于搜索匹配，不直接外显）
ALTER TABLE [dbo].[TestTable]
ADD [SearchKeywords] nvarchar(MAX) NULL
AFTER [Description]; -- 在Description列之后添加

-- 添加SearchKeywords列描述
EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'搜索关键词，用于搜索结果匹配，不直接外显',
    N'SCHEMA', N'dbo',
    N'TABLE', N'TestTable',
    N'COLUMN', N'SearchKeywords';

-- 添加LastUpdated字段（用于显示数据更新时间）
ALTER TABLE [dbo].[TestTable]
ADD [LastUpdated] datetime NULL
AFTER [SearchKeywords]; -- 在SearchKeywords列之后添加

-- 添加LastUpdated列描述
EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'数据更新时间',
    N'SCHEMA', N'dbo',
    N'TABLE', N'TestTable',
    N'COLUMN', N'LastUpdated';

-- 更新现有记录的LastUpdated为当前时间
UPDATE [dbo].[TestTable]
SET [LastUpdated] = GETDATE()
WHERE [LastUpdated] IS NULL;