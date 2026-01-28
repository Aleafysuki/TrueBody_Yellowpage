-- 创建错误反馈表
CREATE TABLE [dbo].[ErrorFeedback] (
    [FeedbackID] INT IDENTITY(1,1) PRIMARY KEY,
    [CardID] INT NULL,
    [Content] NVARCHAR(MAX) NOT NULL,
    [SubmittedAt] DATETIME DEFAULT GETDATE(),
    [Status] NVARCHAR(50) DEFAULT '待处理',
    [ProcessedBy] NVARCHAR(100) NULL,
    [ProcessedAt] DATETIME NULL,
    [Resolution] NVARCHAR(MAX) NULL
);

-- 添加外键约束（可选）
ALTER TABLE [dbo].[ErrorFeedback]
ADD CONSTRAINT [FK_ErrorFeedback_TestTable]
FOREIGN KEY ([CardID])
REFERENCES [dbo].[TestTable]([ID]);

-- 添加列描述
EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'错误反馈ID',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'FeedbackID';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'关联的名片ID',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'CardID';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'反馈内容',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'Content';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'提交时间',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'SubmittedAt';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'处理状态',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'Status';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'处理人',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'ProcessedBy';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'处理时间',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'ProcessedAt';

EXECUTE sp_addextendedproperty
    N'MS_Description',
    N'处理结果',
    N'SCHEMA', N'dbo',
    N'TABLE', N'ErrorFeedback',
    N'COLUMN', N'Resolution';