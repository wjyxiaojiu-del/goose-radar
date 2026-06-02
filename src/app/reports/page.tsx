'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FilePdfOutlined,
  DownloadOutlined,
  ReloadOutlined,
  WarningOutlined,
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { Card, Statistic, Table, Tag, Spin, Button, Alert } from 'antd';

interface ReportData {
  meta: {
    title: string;
    period: string;
    generatedAt: string;
    aiMode: string;
  };
  overview: {
    totalInterns: number;
    highRiskCount: number;
    highPotentialCount: number;
    avgFitScore: number;
    avgRiskScore: number;
    avgPotentialScore: number;
    activeAlerts: number;
    thisWeekAlerts: number;
    riskDistribution: Record<string, number>;
  };
  positionStats: Array<{
    name: string;
    count: number;
    avgFitScore: number;
    avgRiskScore: number;
  }>;
  highRiskInterns: Array<{
    name: string;
    school: string;
    position: string;
    mentor: string;
    fitScore: number;
    riskScore: number;
    potentialScore: number;
    taskCompletionRate: number;
    phase: string;
    abilityScores: Array<{ dimension: string; score: number }>;
    activeAlerts: number;
  }>;
  highPotentialInterns: Array<{
    name: string;
    school: string;
    position: string;
    mentor: string;
    fitScore: number;
    riskScore: number;
    potentialScore: number;
    phase: string;
    abilityScores: Array<{ dimension: string; score: number }>;
  }>;
  aiSummary: string;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/weekly');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [12, 12, 12, 12] as [number, number, number, number],
        filename: `鹅苗雷达-周度报告-${new Date().toLocaleDateString('zh-CN')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#fff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as const },
      };
      await html2pdf().set(opt).from(reportRef.current).save();
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="正在生成报告..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p>报告加载失败</p>
        <Button onClick={fetchReport} icon={<ReloadOutlined />}>重试</Button>
      </div>
    );
  }

  const { meta, overview, positionStats, highRiskInterns, highPotentialInterns, aiSummary } = data;

  const riskColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '岗位', dataIndex: 'position', key: 'position' },
    { title: '导师', dataIndex: 'mentor', key: 'mentor' },
    { title: '适岗度', dataIndex: 'fitScore', key: 'fitScore', render: (v: number) => <Tag color={v >= 60 ? 'success' : v >= 40 ? 'warning' : 'error'}>{v}分</Tag> },
    { title: '风险度', dataIndex: 'riskScore', key: 'riskScore', render: (v: number) => <Tag color="error">{v}分</Tag> },
    { title: '任务完成率', dataIndex: 'taskCompletionRate', key: 'taskCompletionRate', render: (v: number) => `${v}%` },
    { title: '活跃预警', dataIndex: 'activeAlerts', key: 'activeAlerts', render: (v: number) => v > 0 ? <Tag color="error">{v}条</Tag> : '—' },
  ];

  const potentialColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '岗位', dataIndex: 'position', key: 'position' },
    { title: '导师', dataIndex: 'mentor', key: 'mentor' },
    { title: '适岗度', dataIndex: 'fitScore', key: 'fitScore', render: (v: number) => <Tag color={v >= 60 ? 'success' : 'warning'}>{v}分</Tag> },
    { title: '高潜度', dataIndex: 'potentialScore', key: 'potentialScore', render: (v: number) => <Tag color="success">{v}分</Tag> },
    { title: '阶段', dataIndex: 'phase', key: 'phase' },
  ];

  const positionColumns = [
    { title: '岗位', dataIndex: 'name', key: 'name' },
    { title: '人数', dataIndex: 'count', key: 'count' },
    { title: '平均适岗度', dataIndex: 'avgFitScore', key: 'avgFitScore', render: (v: number) => <Tag color={v >= 60 ? 'success' : 'warning'}>{v}分</Tag> },
    { title: '平均风险度', dataIndex: 'avgRiskScore', key: 'avgRiskScore', render: (v: number) => <Tag color={v >= 60 ? 'error' : v >= 40 ? 'warning' : 'success'}>{v}分</Tag> },
  ];

  // Risk distribution bar
  const totalRisk = Object.values(overview.riskDistribution).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>📋 报告中心</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--muted)' }}>
            自动生成周度实习生分析报告，支持一键导出 PDF
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchReport} loading={loading}>
            刷新数据
          </Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={exportPDF} loading={exporting}>
            导出 PDF
          </Button>
        </div>
      </div>

      {meta.aiMode === '演示模式' && (
        <Alert
          message="当前为演示模式 — AI 摘要基于数据模板生成"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          banner
        />
      )}

      {/* Report Content (PDF capture area) */}
      <div ref={reportRef} style={{ background: '#fff', padding: 32, borderRadius: 12, border: '1px solid #e6dfd8' }}>
        {/* Cover */}
        <div style={{ textAlign: 'center', marginBottom: 40, paddingBottom: 30, borderBottom: '2px solid #181715' }}>
          <div style={{ fontSize: 13, color: '#8e8b82', letterSpacing: 2, marginBottom: 12 }}>鹅苗雷达 · AI 实习生管理平台</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px 0', color: '#141413', letterSpacing: 1 }}>
            周度实习生分析报告
          </h1>
          <div style={{ fontSize: 14, color: '#6c6a64' }}>
            报告周期：{meta.period} &nbsp;|&nbsp; 生成时间：{new Date(meta.generatedAt).toLocaleString('zh-CN')} &nbsp;|&nbsp; AI模式：{meta.aiMode}
          </div>
        </div>

        {/* AI Summary */}
        <div style={{ background: '#f8f6f1', borderRadius: 10, padding: '16px 20px', marginBottom: 28, borderLeft: '4px solid #cc785c' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#cc785c', marginBottom: 6 }}>
            <RadarChartOutlined /> AI 管理洞察
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#3d3d3a' }}>{aiSummary}</div>
        </div>

        {/* Overview Stats */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChartOutlined /> 数据概览
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          <Card variant="borderless" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic title="总人数" value={overview.totalInterns} prefix={<TeamOutlined />} valueStyle={{ color: '#141413', fontSize: 24 }} />
          </Card>
          <Card variant="borderless" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic title="高风险" value={overview.highRiskCount} valueStyle={{ color: '#c64545', fontSize: 24 }} prefix={<WarningOutlined />} />
          </Card>
          <Card variant="borderless" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic title="高潜人才" value={overview.highPotentialCount} valueStyle={{ color: '#5db872', fontSize: 24 }} prefix={<TrophyOutlined />} />
          </Card>
          <Card variant="borderless" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic title="平均适岗度" value={overview.avgFitScore} suffix="分" valueStyle={{ color: '#cc785c', fontSize: 24 }} />
          </Card>
          <Card variant="borderless" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic title="待处理预警" value={overview.activeAlerts} valueStyle={{ color: '#d4a017', fontSize: 24 }} />
          </Card>
          <Card variant="borderless" bodyStyle={{ padding: '16px 20px' }}>
            <Statistic title="本周新增预警" value={overview.thisWeekAlerts} valueStyle={{ color: '#8e8b82', fontSize: 24 }} />
          </Card>
        </div>

        {/* Risk Distribution */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>风险分布</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, height: 28, borderRadius: 6, overflow: 'hidden', background: '#f5f0e8' }}>
          {Object.entries(overview.riskDistribution).map(([level, count]) => {
            const pct = totalRisk > 0 ? (count / totalRisk) * 100 : 0;
            const color = level === '高' ? '#c64545' : level === '中' ? '#d4a017' : '#5db872';
            return (
              <div key={level} style={{ width: `${pct}%`, height: '100%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, minWidth: pct > 8 ? 'auto' : 0 }}>
                {pct > 8 ? `${level} ${count}` : ''}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, fontSize: 12, color: '#6c6a64' }}>
          {Object.entries(overview.riskDistribution).map(([level, count]) => (
            <span key={level} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: level === '高' ? '#c64545' : level === '中' ? '#d4a017' : '#5db872' }} />
              {level}风险: {count}人
            </span>
          ))}
        </div>

        {/* High Risk */}
        {highRiskInterns.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#c64545', display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningOutlined /> 高风险人员（{highRiskInterns.length}人）
            </h3>
            <div style={{ marginBottom: 28 }}>
              <Table
                dataSource={highRiskInterns}
                columns={riskColumns}
                rowKey="name"
                pagination={false}
                size="small"
                bordered
              />
            </div>
          </>
        )}

        {/* High Potential */}
        {highPotentialInterns.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#5db872', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrophyOutlined /> 高潜人才（{highPotentialInterns.length}人）
            </h3>
            <div style={{ marginBottom: 28 }}>
              <Table
                dataSource={highPotentialInterns}
                columns={potentialColumns}
                rowKey="name"
                pagination={false}
                size="small"
                bordered
              />
            </div>
          </>
        )}

        {/* Position Stats */}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>岗位统计</h3>
        <div style={{ marginBottom: 20 }}>
          <Table
            dataSource={positionStats}
            columns={positionColumns}
            rowKey="name"
            pagination={false}
            size="small"
            bordered
          />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e6dfd8', textAlign: 'center', fontSize: 12, color: '#b7b0a7' }}>
          本报告由 鹅苗雷达 AI 实习生管理平台 自动生成 · 数据截止 {new Date(meta.generatedAt).toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  );
}
