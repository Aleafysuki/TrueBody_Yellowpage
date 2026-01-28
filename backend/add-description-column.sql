-- 向TestTable表添加Description列的SQL脚本
ALTER TABLE [dbo].[TestTable]
ADD [Description] nvarchar(MAX) NULL
AFTER [Name]; -- 在Name列之后添加

-- 添加列描述
EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'企业/网站描述',
    N'SCHEMA', N'dbo',
    N'TABLE', N'TestTable',
    N'COLUMN', N'Description';