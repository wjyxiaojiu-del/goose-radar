'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Progress, Space, Button, Typography } from 'antd';
import {
  AlertOutlined,
  StarOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  RadarChartOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChartWithFallback } from '@/components/chart-with-fallback';
import { FallbackBanner } from '@/components/fallback-banner';
import { FlowStage } from '@/components/flow-stage';
import { AIStatusBadge } from '@/components/ai-status-badge';
import { fetchJson } from '@/lib/fetch-json';

const { Text } = Typography;

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="chart-skeleton" />,
});

interface DashboardData {
  stats: {
    totalInterns: number;
    highRiskCount: number;
    highPotentialCount: number;
    avgFitScore: number;
    alertsNeedingHR: number;
    feedbackRate: number;
  };
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  positionStats: Array<{
    name: string;
    count: number;
    avgFitScore: number;
    highRiskCount: number;
    highPotentialCount: number;
  }>;
  aiReminders: Array<{
    id: number;
    type: string;
    content: string;
    priority: string;
    internId?: string;
  }>;
  aiStatus?: 'live' | 'cached-live' | 'cached-fallback' | 'fallback';
}

const FALLBACK_DASHBOARD_DATA: DashboardData = {
  stats: {
    totalInterns: 20,
    highRiskCount: 4,
    highPotentialCount: 9,
    avgFitScore: 69,
    alertsNeedingHR: 2,
    feedbackRate: 100,
  },
  riskDistribution: {
    high: 4,
    medium: 5,
    low: 11,
  },
  positionStats: [
    { name: '研发实习生', count: 8, avgFitScore: 71, highRiskCount: 2, highPotentialCount: 4 },
    { name: '产品实习生', count: 7, avgFitScore: 73, highRiskCount: 1, highPotentialCount: 3 },
    { name: '销售实习生', count: 5, avgFitScore: 61, highRiskCount: 1, highPotentialCount: 2 },
  ],
  aiReminders: [
    {
      id: 1,
      type: 'warning',
      content: '张晨连续两周任务延期，建议导师本周进行一次1v1沟通。',
      priority: 'high',
      internId: 'demo-001',
    },
    {
      id: 2,
      type: 'success',
      content: '李安然产品sense提升明显，可加入重点培养名单。',
      priority: 'medium',
    },
    {
      id: 3,
      type: 'info',
      content: '销售岗整体适岗度低于研发岗10分，建议检查岗位任务设计是否过难。',
      priority: 'medium',
    },
  ],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(FALLBACK_DASHBOARD_DATA);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetchJson<DashboardData>('/api/dashboard', {
      fallback: FALLBACK_DASHBOARD_DATA,
      validate: (d): d is DashboardData => !!d && typeof d === 'object' && 'stats' in d && 'riskDistribution' in d,
      timeoutMs: 6000,
      cacheMs: 60_000,
    }).then(({ data, isFallback: fb }) => {
      if (mounted) {
        setData(data);
        setIsFallback(fb);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const riskTotal = data.riskDistribution.high + data.riskDistribution.medium + data.riskDistribution.low;
  const riskRate = riskTotal ? Math.round(data.stats.highRiskCount / riskTotal * 100) : 0;
  const potentialRate = data.stats.totalInterns
    ? Math.round(data.stats.highPotentialCount / data.stats.totalInterns * 100)
    : 0;
  const primaryReminder = data.aiReminders.find(r => r.internId);
  const demoHref = primaryReminder?.internId ? `/interventions/${primaryReminder.internId}` : '/alerts';
  const showCaseLink = !!primaryReminder?.internId;

  // 风险分布饼图
  const riskPieOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { bottom: '0%', left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{
      name: '风险分布',
      type: 'pie',
      radius: ['42%', '66%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: {
        label: { show: true, fontSize: 18, fontWeight: 'bold' },
      },
      labelLine: { show: false },
      data: [
        { value: data.riskDistribution.high, name: '高风险', itemStyle: { color: '#d94b4b' } },
        { value: data.riskDistribution.medium, name: '中风险', itemStyle: { color: '#d99a2b' } },
        { value: data.riskDistribution.low, name: '稳定', itemStyle: { color: '#3b9f6b' } },
      ],
    }],
  }), [data.riskDistribution.high, data.riskDistribution.medium, data.riskDistribution.low]);

  // 岗位对比柱状图
  const positionBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['平均适岗度', '高风险', '高潜'], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: '6%', top: '18%', containLabel: true },
    xAxis: { type: 'category', data: data.positionStats.map(p => p.name.replace('实习生', '')), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', max: 100, axisLabel: { fontSize: 11 } },
    series: [
      {
        name: '平均适岗度',
        type: 'bar',
        barWidth: 20,
        data: data.positionStats.map(p => p.avgFitScore),
        itemStyle: { color: '#4f6dbd', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '高风险',
        type: 'bar',
        barWidth: 20,
        data: data.positionStats.map(p => p.highRiskCount),
        itemStyle: { color: '#d94b4b', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '高潜',
        type: 'bar',
        barWidth: 20,
        data: data.positionStats.map(p => p.highPotentialCount),
        itemStyle: { color: '#3b9f6b', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }), [data.positionStats]);

  // 高潜类型分布（从positionStats聚合）
  const potentialBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.positionStats.map(p => p.name.replace('实习生', '')) },
    yAxis: { type: 'value' },
    series: [{
      name: '高潜人数',
      type: 'bar',
      barWidth: 30,
      data: data.positionStats.map(p => ({
        value: p.highPotentialCount,
        itemStyle: { color: '#cc785c', borderRadius: [4, 4, 0, 0] },
      })),
    }],
  }), [data.positionStats]);

  return (
    <div className="dashboard-page">
      <FallbackBanner visible={isFallback} label="仪表盘" />
      <FlowStage current="scan" caseId={primaryReminder?.internId} />
      <section data-demo="ai-banner" className="dashboard-hero hero-glass-card">
        <div className="dashboard-hero-main">
          <div className="hero-status-row">
            <span className="hero-status-pill">
              <RadarChartOutlined />
              AI 扫描完成
            </span>
            <span className="hero-live-dot">待 HR 介入 {data.stats.alertsNeedingHR} 起</span>
          </div>

          <h2>从风险发现到干预闭环，一屏讲清楚。</h2>
          <p>
            面向 HR 评审演示，把实习生扫描结果、风险预警、高潜人才和下一步行动合成一条清晰路径。
          </p>

          <div className="hero-signal-grid">
            <div>
              <span>本周扫描</span>
              <strong>{data.stats.totalInterns}</strong>
              <small>名实习生</small>
            </div>
            <div>
              <span>风险信号</span>
              <strong>{data.riskDistribution.high + data.riskDistribution.medium}</strong>
              <small>人需关注</small>
            </div>
            <div>
              <span>高潜识别</span>
              <strong>{data.stats.highPotentialCount}</strong>
              <small>名候选</small>
            </div>
          </div>
        </div>

        <div className="dashboard-hero-panel">
          <div className="demo-flow-label">演示叙事</div>
          <div className="demo-flow-list">
            <span>扫描总览</span>
            <ArrowRightOutlined />
            <span>风险个案</span>
            <ArrowRightOutlined />
            <span>AI 方案</span>
            <ArrowRightOutlined />
            <span>HR 跟进</span>
          </div>
          <div className="hero-actions">
            <Link href={demoHref}>
              <Button type="primary" size="large" icon={<ArrowRightOutlined />}>
                {showCaseLink ? '进入关键个案' : '查看风险预警'}
              </Button>
            </Link>
            <Link href="/alerts">
              <Button size="large">预警池 ({data.riskDistribution.high + data.riskDistribution.medium})</Button>
            </Link>
            <Link href="/suggestions">
              <Button size="large">AI 建议</Button>
            </Link>
          </div>
        </div>
      </section>

      <Row gutter={[16, 16]} className="dashboard-kpi-row">
        <Col xs={24} md={8}>
          <Card variant="borderless" className="dashboard-kpi-card risk">
            <Statistic
              title="高风险人数"
              value={data.stats.highRiskCount}
              suffix={`/ ${riskTotal}`}
              prefix={<AlertOutlined />}
              styles={{ content: { color: 'var(--risk-high)', fontSize: 30 } }}
            />
            <div className="kpi-footer">
              <Tag color="red">{riskRate}% 风险率</Tag>
              <span>{data.stats.highRiskCount > 3 ? '需立即安排 HR 介入' : '风险可控，保持关注'}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="dashboard-kpi-card potential">
            <Statistic
              title="高潜人才"
              value={data.stats.highPotentialCount}
              suffix={`/ ${data.stats.totalInterns}`}
              prefix={<StarOutlined />}
              styles={{ content: { color: 'var(--potential)', fontSize: 30 } }}
            />
            <div className="kpi-footer">
              <Tag color="cyan">{potentialRate}% 高潜率</Tag>
              <span>{data.stats.highPotentialCount >= 5 ? '建议进入重点培养池' : '需继续扩大候选池'}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="dashboard-kpi-card fit">
            <Statistic
              title="平均适岗度"
              value={data.stats.avgFitScore}
              suffix="/ 100"
              prefix={<RiseOutlined />}
              styles={{ content: { color: 'var(--color-fit)', fontSize: 30 } }}
            />
            <Progress
              percent={data.stats.avgFitScore}
              size="small"
              showInfo={false}
              strokeColor={data.stats.avgFitScore >= 70 ? '#3b9f6b' : '#d99a2b'}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card
            title="风险分布"
            variant="borderless"
            styles={{ body: { padding: '6px 0 10px' } }}
          >
            <ChartWithFallback
              fallback={
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: '高风险', value: data.riskDistribution.high, color: '#d94b4b', bg: '#fdf0ef' },
                    { label: '中风险', value: data.riskDistribution.medium, color: '#d99a2b', bg: '#fdf6e6' },
                    { label: '稳定', value: data.riskDistribution.low, color: '#3b9f6b', bg: '#eef8f2' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--ink)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600, color: item.color }}>{item.value}人</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${riskTotal ? (item.value / riskTotal) * 100 : 0}%`, background: item.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    风险率 {riskRate}% · 共 {riskTotal} 人
                  </div>
                </div>
              }
            >
              <ReactECharts option={riskPieOption} style={{ height: 210 }} />
            </ChartWithFallback>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title="岗位对比"
            variant="borderless"
            styles={{ body: { padding: '6px 0 10px' } }}
          >
            <ChartWithFallback
              fallback={
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.positionStats.map(pos => {
                    const name = pos.name.replace('实习生', '');
                    return (
                      <div key={pos.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{name}</span>
                          <span style={{ color: 'var(--muted)' }}>适岗度 <strong style={{ color: '#4f6dbd' }}>{pos.avgFitScore}</strong></span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pos.avgFitScore}%`, background: '#4f6dbd', borderRadius: 4 }} />
                          </div>
                          <Tag color="red" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>风险{pos.highRiskCount}</Tag>
                          <Tag color="green" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>高潜{pos.highPotentialCount}</Tag>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            >
              <ReactECharts option={positionBarOption} style={{ height: 210 }} />
            </ChartWithFallback>
          </Card>
        </Col>
      </Row>

      {/* AI 今日提醒 */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#e8a55a' }} />
            <span style={{ color: 'var(--canvas)' }}>AI 今日提醒</span>
            <Tag color="volcano">{data.aiReminders.length}</Tag>
            <AIStatusBadge status={data.aiStatus} />
          </Space>
        }
        variant="borderless"
        className="today-reminder-card"
        style={{ marginBottom: 16, background: 'var(--surface-dark)' }}
        styles={{ header: { borderBottomColor: 'rgba(250,249,245,0.12)' } }}
      >
        {data.aiReminders.map(reminder => (
          <div
            key={reminder.id}
            className="today-reminder-item"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: reminder.priority === 'high' ? '#e8a55a' : '#5db8a6', flexShrink: 0 }} />
              <span style={{ fontSize: 13, lineHeight: 1.6 }}>{reminder.content}</span>
            </div>
            <div style={{ flexShrink: 0 }}>
                {reminder.internId && (
                  <Link href={`/interns/${reminder.internId}`}>
                    <Button size="small" style={{ background: 'rgba(250,249,245,0.12)', borderColor: 'rgba(250,249,245,0.18)', color: 'var(--canvas)' }}>查看详情</Button>
                  </Link>
                )}
            </div>
          </div>
        ))}
      </Card>

      {/* 岗位详情 + 高潜分布 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="岗位概况" variant="borderless">
            {data.positionStats.map(pos => (
              <div key={pos.name} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong>{pos.name}</Text>
                  <Space>
                    <Tag color="blue">{pos.count}人</Tag>
                    {pos.highRiskCount > 0 && <Tag color="red">{pos.highRiskCount}高风险</Tag>}
                    {pos.highPotentialCount > 0 && <Tag color="cyan">{pos.highPotentialCount}高潜</Tag>}
                  </Space>
                </div>
                <Progress
                  percent={pos.avgFitScore}
                  size="small"
                  strokeColor={pos.avgFitScore >= 70 ? '#4f6dbd' : '#d99a2b'}
                  format={p => `适岗度 ${p}`}
                />
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="高潜人才分布"
            variant="borderless"
            styles={{ body: { padding: '12px 0' } }}
          >
            <ChartWithFallback
              fallback={
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.positionStats.map(pos => {
                    const name = pos.name.replace('实习生', '');
                    const maxVal = Math.max(...data.positionStats.map(p => p.highPotentialCount), 1);
                    return (
                      <div key={pos.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink)', width: 32, textAlign: 'right' }}>{name}</span>
                        <div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(pos.highPotentialCount / maxVal) * 100}%`, background: '#cc785c', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, minWidth: pos.highPotentialCount > 0 ? 24 : 0 }}>
                            <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{pos.highPotentialCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            >
              <ReactECharts option={potentialBarOption} style={{ height: 200 }} />
            </ChartWithFallback>
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <Link href="/potentials">
                <Button type="link">查看全部高潜人才 →</Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
