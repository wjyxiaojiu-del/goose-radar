'use client';

import Link from 'next/link';
import { Grid } from 'antd';
import {
  RadarChartOutlined,
  WarningOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

export type StageKey = 'scan' | 'alert' | 'suggest' | 'intervene' | 'track';

const STAGES: { key: StageKey; label: string; href: string; icon: React.ReactNode }[] = [
  { key: 'scan',      label: '扫描', href: '/',              icon: <RadarChartOutlined /> },
  { key: 'alert',     label: '发现', href: '/alerts',        icon: <WarningOutlined /> },
  { key: 'suggest',   label: '建议', href: '/suggestions',   icon: <BulbOutlined /> },
  { key: 'intervene', label: '识别', href: '/potentials',    icon: <ThunderboltOutlined /> },
  { key: 'track',     label: '跟踪', href: '/interns',       icon: <CheckCircleOutlined /> },
];

/**
 * 流程阶段指示器 — 放在各页面顶部，让评审一眼知道"我在闭环哪一步"。
 * current 标记当前阶段，已完成的阶段可点击跳转。
 * 小屏只显示图标 + 连接线，大屏显示完整标签。
 */
export function FlowStage({ current }: { current: StageKey }) {
  const screens = useBreakpoint();
  const compact = !screens.sm;
  const currentIdx = STAGES.findIndex(s => s.key === current);

  return (
    <nav className="flow-stage" aria-label="演示流程" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: compact ? 'center' : 'flex-start',
      gap: 0,
      padding: compact ? '8px 0' : '10px 0',
      marginBottom: compact ? 12 : 16,
      overflowX: 'auto',
    }}>
      {STAGES.map((stage, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;

        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }}>
            <Link
              href={stage.href}
              title={stage.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? 0 : 6,
                padding: compact ? '6px 8px' : '5px 12px',
                borderRadius: 20,
                fontSize: compact ? 14 : 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--canvas)' : isDone ? 'var(--ink)' : 'var(--muted)',
                background: isActive ? 'var(--ink)' : isDone ? 'var(--surface-soft)' : 'transparent',
                border: isActive ? 'none' : '1px solid var(--hairline)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                minWidth: compact ? 32 : undefined,
              }}
            >
              <span style={{ fontSize: compact ? 16 : 13, display: 'flex' }}>
                {isDone ? <CheckCircleOutlined style={{ color: 'var(--risk-low)' }} /> : stage.icon}
              </span>
              {!compact && <span>{stage.label}</span>}
            </Link>

            {/* 连接线 */}
            {i < STAGES.length - 1 && (
              <div style={{
                width: compact ? 16 : 24,
                height: 1,
                background: i < currentIdx ? 'var(--risk-low)' : 'var(--hairline)',
                margin: '0 2px',
                flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
