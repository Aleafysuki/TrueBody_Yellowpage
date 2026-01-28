-- 向TestTable表添加分类列的SQL脚本
-- 请在SQL Server管理工具中执行此脚本

-- 1. 添加Category列
ALTER TABLE [dbo].[TestTable]
ADD [Category] nvarchar(MAX) NULL;

-- 2. 添加列描述
EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'名片分类',
    N'SCHEMA', N'dbo',
    N'TABLE', N'TestTable',
    N'COLUMN', N'Category';

-- 3. 设置已有记录的默认值（可选）
-- UPDATE [dbo].[TestTable]
-- SET [Category] = N'未分类'
-- WHERE [Category] IS NULL;

PRINT '分类列已成功添加到TestTable表';