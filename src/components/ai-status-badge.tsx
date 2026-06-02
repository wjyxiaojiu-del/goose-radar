'use client';

import { Tag, Tooltip } from 'antd';

export type AIStatus = 'live' | 'cached-live' | 'cached-fallback' | 'fallback';

const STATUS_MAP: Record<AIStatus, { label: string; color: string; tip: string }> = {
  'live':            { label: 'MiMo 实时生成', color: 'volcano', tip: '本次请求由 MiMo LLM 实时返回，未走缓存' },
  'cached-live':     { label: 'MiMo 缓存命中', color: 'blue',    tip: '命中最近一次 MiMo 生成结果（10 分钟内），秒开' },
  'cached-fallback': { label: '稳定方案缓存', color: 'orange',  tip: '模型超时，已启用经过验证的稳定方案缓存，HR 工作流不中断' },
  'fallback':        { label: '规则兜底',     color: 'default', tip: '模型暂不可用，按规则生成兜底方案' },
};

/**
 * 统一展示当前数据的 AI 来源，让评审一眼看清 live / cached / fallback。
 * 不传 status 时不渲染。
 */
export function AIStatusBadge({ status, size = 'default' }: { status?: AIStatus | string; size?: 'small' | 'default' }) {
  if (!status || !(status in STATUS_MAP)) return null;
  const cfg = STATUS_MAP[status as AIStatus];
  const fontSize = size === 'small' ? 10 : 11;
  return (
    <Tooltip title={cfg.tip}>
      <Tag color={cfg.color} style={{ fontSize, marginInlineEnd: 0, fontWeight: 400, lineHeight: '18px' }}>
        {cfg.label}
      </Tag>
    </Tooltip>
  );
}
