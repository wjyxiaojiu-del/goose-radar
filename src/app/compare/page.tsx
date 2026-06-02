'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Tag, Empty, Button, Space, Avatar, Row, Col, Progress, Alert } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchJson } from '@/lib/fetch-json';
import { ChartWithFallback } from '@/components/chart-with-fallback';
import { AIStatusBadge } from '@/components/ai-status-badge';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="chart-skeleton" />,
});

interface InternDetail {
  basicInfo: {
    id: string;
    name: string;
    school: string;
    position: string;
    mentor: string;
  };
  scores: {
    fitScore: number;
    riskScore: number;
    potentialScore: number;
  };
  tags: string[];
  riskLevel: string;
  taskCompletionRate: number;
  abilityScores: Array<{ dimension: string; score: number }>;
  trendData: Array<{ week: string; fitScore: number; riskScore: number; potentialScore: number }>;
  aiExplanation: {
    conclusion: string;
    actions: string[];
  };
  aiStatus?: 'live' | 'cached-live' | 'cached-fallback' | 'fallback';
}

const SERIES_COLORS = ['#cc785c', '#4f6dbd', '#3b9f6b', '#d99a2b'];

const EMPTY_DETAIL: InternDetail = {
  basicInfo: { id: '', name: '未知', school: '', position: '', mentor: '' },
  scores: { fitScore: 0, riskScore: 0, potentialScore: 0 },
  tags: [],
  riskLevel: '低',
  taskCompletionRate: 0,
  abilityScores: [],
  trendData: [],
  aiExplanation: { conclusion: '', actions: [] },
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="chart-skeleton" />}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const ids = useMemo(
    () => idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4),
    [idsParam]
  );

  const [results, setResults] = useState<Record<string, InternDetail | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      ids.map(id =>
        fetchJson<InternDetail>(`/api/interns/${id}`, {
          fallback: EMPTY_DETAIL,
          validate: (d): d is InternDetail => !!d && typeof d === 'object' && 'basicInfo' in d,
          timeoutMs: 8000,
        }).then(({ data, isFallback }) => [id, isFallback ? null : data] as const).catch(() => [id, null] as const)
      )
    ).then(pairs => {
      const next: Record<string, InternDetail | null> = {};
      for (const [id, data] of pairs) next[id] = data;
      setResults(next);
      setLoading(false);
    });
  }, [ids]);

  const interns = ids.map(id => results[id]).filter((i): i is InternDetail => !!i);

  // 雷达图：多对象叠加
  const radarOption = useMemo(() => {
    if (interns.length === 0) return null;
    const baseAbilities = interns[0].abilityScores;
    return {
      tooltip: {},
      legend: {
        data: interns.map(i => i.basicInfo.name),
        bottom: 0,
        itemWidth: 12,
        itemHeight: 8,
      },
      radar: {
        indicator: baseAbilities.map(a => ({ name: a.dimension, max: 100 })),
        radius: '62%',
      },
      series: [{
        type: 'radar',
        data: interns.map((intern, i) => ({
          name: intern.basicInfo.name,
          value: baseAbilities.map(b => {
            const found = intern.abilityScores.find(a => a.dimension === b.dimension);
            return found?.score ?? 0;
          }),
          lineStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length], width: 2 },
          areaStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] + '22' },
          itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
        })),
      }],
    };
  }, [interns]);

  // 三大评分柱状图
  const scoreBarOption = useMemo(() => {
    if (interns.length === 0) return null;
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, itemWidth: 12, itemHeight: 8 },
      grid: { left: '3%', right: '4%', bottom: '6%', top: '16%', containLabel: true },
      xAxis: { type: 'category', data: interns.map(i => i.basicInfo.name) },
      yAxis: { type: 'value', max: 100 },
      series: [
        {
          name: '适岗度',
          type: 'bar',
          data: interns.map(i => i.scores.fitScore),
          itemStyle: { color: '#4f6dbd', borderRadius: [4, 4, 0, 0] },
          barWidth: 16,
        },
        {
          name: '风险度',
          type: 'bar',
          data: interns.map(i => i.scores.riskScore),
          itemStyle: { color: '#d94b4b', borderRadius: [4, 4, 0, 0] },
          barWidth: 16,
        },
        {
          name: '高潜度',
          type: 'bar',
          data: interns.map(i => i.scores.potentialScore),
          itemStyle: { color: '#3b9f6b', borderRadius: [4, 4, 0, 0] },
          barWidth: 16,
        },
      ],
    };
  }, [interns]);

  // 趋势对比折线图
  const trendOption = useMemo(() => {
    if (interns.length === 0) return null;
    const weeks = interns[0].trendData.map(t => t.week.substring(5));
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: interns.map(i => i.basicInfo.name), top: 0, itemWidth: 12, itemHeight: 8 },
      grid: { left: '3%', right: '4%', bottom: '6%', top: '18%', containLabel: true },
      xAxis: { type: 'category', data: weeks },
      yAxis: { type: 'value', max: 100, name: '适岗度' },
      series: interns.map((intern, i) => ({
        name: intern.basicInfo.name,
        type: 'line',
        smooth: true,
        data: intern.trendData.map(t => t.fitScore),
        lineStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length], width: 2 },
        itemStyle: { color: SERIES_COLORS[i % SERIES_COLORS.length] },
        symbol: 'circle',
        symbolSize: 6,
      })),
    };
  }, [interns]);

  // AI 一句话对比结论（前端简易聚合）
  const compareInsight = useMemo(() => {
    if (interns.length < 2) return null;
    const sortedByFit = [...interns].sort((a, b) => b.scores.fitScore - a.scores.fitScore);
    const sortedByPotential = [...interns].sort((a, b) => b.scores.potentialScore - a.scores.potentialScore);
    const sortedByRisk = [...interns].sort((a, b) => b.scores.riskScore - a.scores.riskScore);
    return {
      bestFit: sortedByFit[0].basicInfo.name,
      bestPotential: sortedByPotential[0].basicInfo.name,
      highestRisk: sortedByRisk[0].basicInfo.name,
      highestRiskScore: sortedByRisk[0].scores.riskScore,
    };
  }, [interns]);

  if (ids.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Link href="/interns">
            <Button icon={<ArrowLeftOutlined />}>返回实习生列表</Button>
          </Link>
        </div>
        <Card variant="borderless">
          <Empty description="请从实习生列表勾选 2-4 人后点击「对比」" />
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Link href="/interns">
            <Button icon={<ArrowLeftOutlined />}>返回实习生列表</Button>
          </Link>
        </div>
        <Card variant="borderless">
          <div className="chart-skeleton" style={{ height: 240 }} />
        </Card>
      </div>
    );
  }

  if (interns.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Link href="/interns">
            <Button icon={<ArrowLeftOutlined />}>返回实习生列表</Button>
          </Link>
        </div>
        <Card variant="borderless">
          <Empty description="未找到选中的实习生数据" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* 顶部导航 + 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <Link href="/interns">
            <Button icon={<ArrowLeftOutlined />}>返回</Button>
          </Link>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: 'var(--ai)' }} />
            实习生横向对比
          </h2>
          <Tag color="volcano">{interns.length} 人</Tag>
        </Space>
      </div>

      {/* AI 对比一句话结论 */}
      {compareInsight && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, background: 'var(--ai-soft)', border: '1px solid var(--ai-border, rgba(204,120,92,0.18))' }}
          message={
            <span style={{ fontSize: 13 }}>
              AI 对比洞察：<strong style={{ color: '#3b9f6b' }}>{compareInsight.bestFit}</strong> 适岗最佳，
              <strong style={{ color: '#4f6dbd' }}>{compareInsight.bestPotential}</strong> 高潜最突出，
              <strong style={{ color: '#d94b4b' }}>{compareInsight.highestRisk}</strong> 风险最高（{compareInsight.highestRiskScore}分），建议优先关注。
            </span>
          }
        />
      )}

      {/* 实习生卡片行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {interns.map((intern, idx) => {
          const accent = SERIES_COLORS[idx % SERIES_COLORS.length];
          return (
            <Col key={intern.basicInfo.id} xs={24} sm={12} md={24 / Math.min(interns.length, 4)}>
              <Card
                variant="borderless"
                style={{ borderTop: `3px solid ${accent}`, height: '100%' }}
                styles={{ body: { padding: 16 } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar size={36} style={{ background: accent, fontWeight: 600 }}>
                    {intern.basicInfo.name.charAt(0)}
                  </Avatar>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Link href={`/interns/${intern.basicInfo.id}`} style={{ color: 'var(--ink)' }}>
                        {intern.basicInfo.name}
                      </Link>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {intern.basicInfo.position.replace('实习生', '')} · {intern.basicInfo.mentor}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Tag color={intern.riskLevel === '高' ? 'red' : intern.riskLevel === '中' ? 'orange' : 'green'} style={{ margin: 0 }}>
                    {intern.riskLevel}风险
                  </Tag>
                  {intern.tags.slice(0, 2).map((t, i) => (
                    <Tag key={i} style={{ margin: 0, fontSize: 11 }}>{t}</Tag>
                  ))}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                    <span>适岗度</span><strong style={{ color: '#4f6dbd' }}>{intern.scores.fitScore}</strong>
                  </div>
                  <Progress percent={intern.scores.fitScore} size="small" showInfo={false} strokeColor="#4f6dbd" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                    <span>风险度</span><strong style={{ color: '#d94b4b' }}>{intern.scores.riskScore}</strong>
                  </div>
                  <Progress percent={intern.scores.riskScore} size="small" showInfo={false} strokeColor="#d94b4b" />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                    <span>高潜度</span><strong style={{ color: '#3b9f6b' }}>{intern.scores.potentialScore}</strong>
                  </div>
                  <Progress percent={intern.scores.potentialScore} size="small" showInfo={false} strokeColor="#3b9f6b" />
                </div>

                <div style={{ paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>AI 结论</span>
                    <AIStatusBadge status={intern.aiStatus} size="small" />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 8 }}>
                    {intern.aiExplanation.conclusion}
                  </div>
                  {intern.aiExplanation.actions.slice(0, 2).map((a, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--ai)', display: 'flex', gap: 4, alignItems: 'flex-start', marginBottom: 2 }}>
                      <CheckCircleOutlined style={{ fontSize: 11, marginTop: 3, flexShrink: 0 }} />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 评分对比 + 雷达 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="三大评分对比" variant="borderless" styles={{ body: { padding: '6px 0 10px' } }}>
            <ChartWithFallback
              fallback={
                <div style={{ padding: 20 }}>
                  {interns.map(i => (
                    <div key={i.basicInfo.id} style={{ marginBottom: 8, fontSize: 12 }}>
                      <strong>{i.basicInfo.name}</strong>：适岗 {i.scores.fitScore} · 风险 {i.scores.riskScore} · 潜力 {i.scores.potentialScore}
                    </div>
                  ))}
                </div>
              }
            >
              {scoreBarOption && <ReactECharts option={scoreBarOption} style={{ height: 260 }} />}
            </ChartWithFallback>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="能力雷达对比" variant="borderless" styles={{ body: { padding: '6px 0 10px' } }}>
            <ChartWithFallback
              fallback={
                <div style={{ padding: 20, fontSize: 12, color: 'var(--muted)' }}>
                  雷达图加载中，可在评分对比图查看综合差距。
                </div>
              }
            >
              {radarOption && <ReactECharts option={radarOption} style={{ height: 260 }} />}
            </ChartWithFallback>
          </Card>
        </Col>
      </Row>

      {/* 趋势对比 */}
      <Card title="适岗度趋势对比" variant="borderless" styles={{ body: { padding: '6px 0 10px' } }}>
        <ChartWithFallback
          fallback={
            <div style={{ padding: 20, fontSize: 12, color: 'var(--muted)' }}>
              趋势图加载中。
            </div>
          }
        >
          {trendOption && <ReactECharts option={trendOption} style={{ height: 280 }} />}
        </ChartWithFallback>
      </Card>
    </div>
  );
}
