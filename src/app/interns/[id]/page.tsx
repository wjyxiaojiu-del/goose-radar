'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  Row,
  Col,
  Tag,
  Progress,
  Descriptions,
  Timeline,
  Alert,
  Button,
  Space,
  Divider,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import { FlowStage } from '@/components/flow-stage';
import { ChartWithFallback } from '@/components/chart-with-fallback';

const { Title, Text, Paragraph } = Typography;

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="chart-skeleton" />,
});

interface InternDetail {
  basicInfo: {
    id: string;
    name: string;
    gender: string;
    school: string;
    major: string;
    entryDate: string;
    phase: string;
    position: string;
    mentor: string;
    department: string;
  };
  scores: {
    fitScore: number;
    riskScore: number;
    potentialScore: number;
  };
  tags: string[];
  riskLevel: string;
  potentialType: string;
  taskCompletionRate: number;
  abilityScores: Array<{
    dimension: string;
    score: number;
  }>;
  positionAnalysis: {
    requirements: string[];
    currentPerformance: Array<{
      dimension: string;
      score: number;
      status: string;
    }>;
    aiConclusion: string;
  };
  weeklyReports: Array<{
    weekStart: string;
    content: string;
    aiSummary: string;
    emotionSignal: string;
    difficulties: string;
    needsHelp: boolean;
  }>;
  mentorFeedbacks: Array<{
    weekStart: string;
    mentorName: string;
    performance: number;
    comment: string;
    strengths: string;
    concerns: string;
    needsHR: boolean;
  }>;
  riskAlerts: Array<{
    id: string;
    type: string;
    level: string;
    reason: string[];
    action: string;
    createdAt: string;
  }>;
  trendData: Array<{
    week: string;
    fitScore: number;
    riskScore: number;
    potentialScore: number;
    taskCompletionRate: number;
  }>;
  aiExplanation: {
    text: string;
    signals: string[];
    reasoning: string[];
    conclusion: string;
    actions: string[];
  };
}

const FALLBACK_INTERN_DETAIL: InternDetail = {
  basicInfo: { id: 'demo-001', name: '张晨', gender: '男', school: '浙江大学', major: '计算机科学', entryDate: '2026-03-01', phase: '产出期', position: '研发实习生', mentor: '王建国', department: '技术部' },
  scores: { fitScore: 52, riskScore: 78, potentialScore: 65 },
  tags: ['任务延期', '代码质量高', '有点迷茫'],
  riskLevel: '高',
  potentialType: '',
  taskCompletionRate: 45,
  abilityScores: [{ dimension: '编码能力', score: 72 }, { dimension: '沟通协作', score: 45 }, { dimension: '任务管理', score: 38 }, { dimension: '学习能力', score: 68 }, { dimension: '主动性', score: 50 }],
  positionAnalysis: { requirements: ['熟悉 React/TypeScript', '能独立完成模块开发', '良好的代码规范意识', '主动沟通技术方案'], currentPerformance: [{ dimension: '编码能力', score: 72, status: 'moderate' }, { dimension: '沟通协作', score: 45, status: 'weak' }, { dimension: '任务管理', score: 38, status: 'weak' }], aiConclusion: '技术基础扎实但沟通和任务管理能力需提升，建议降低任务复杂度并增加导师1v1频率。' },
  weeklyReports: [{ weekStart: '2026-05-19', content: '本周完成2个模块开发', aiSummary: '完成核心模块开发，但联调阶段遇到困难，需要更多技术支持', emotionSignal: '中性', difficulties: '联调接口文档不清晰', needsHelp: true }],
  mentorFeedbacks: [{ weekStart: '2026-05-19', mentorName: '王建国', performance: 3, comment: '技术能力不错但需要更主动沟通', strengths: '代码质量稳定', concerns: '遇到问题不主动求助', needsHR: false }],
  riskAlerts: [{ id: 'alert-001', type: '能力错配', level: '高', reason: ['连续两周任务延期', '核心模块联调失败率高'], action: '安排导师1v1沟通', createdAt: '2026-05-28T10:00:00Z' }],
  trendData: [{ week: '2026-04-28', fitScore: 60, riskScore: 55, potentialScore: 62, taskCompletionRate: 65 }, { week: '2026-05-05', fitScore: 58, riskScore: 60, potentialScore: 63, taskCompletionRate: 58 }, { week: '2026-05-12', fitScore: 55, riskScore: 68, potentialScore: 64, taskCompletionRate: 50 }, { week: '2026-05-19', fitScore: 52, riskScore: 78, potentialScore: 65, taskCompletionRate: 45 }],
  aiExplanation: { text: '综合分析', signals: ['任务完成率下降20%', '周报情绪转消极', '联调失败率上升'], reasoning: ['技术能力尚可但任务管理薄弱', '遇到困难不主动求助导致延期累积', '周报中出现"有点迷茫"等表达'], conclusion: '高风险：需立即干预', actions: ['安排导师1v1沟通', '降低任务复杂度', '明确短期可验收目标'] },
};

export default function InternDetailPage() {
  const params = useParams();
  const [intern, setIntern] = useState<InternDetail>(FALLBACK_INTERN_DETAIL);
  const [forecast, setForecast] = useState<Array<{ week: string; fitScore: number; riskScore: number; potentialScore: number }> | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchJson<InternDetail>(`/api/interns/${params.id}`, {
        fallback: FALLBACK_INTERN_DETAIL,
        validate: (d): d is InternDetail => !!d && typeof d === 'object' && 'basicInfo' in d,
        timeoutMs: 6000,
      }).then(({ data }) => {
        setIntern(data);
      });
      // Load forecast data
      setForecastLoading(true);
      fetch(`/api/interns/${params.id}/predict`)
        .then(r => r.json())
        .then(d => {
          if (d.forecast) setForecast(d.forecast);
        })
        .catch(() => {})
        .finally(() => setForecastLoading(false));
    }
  }, [params.id]);

  // 能力雷达图配置
  const radarOption = useMemo(() => ({
    tooltip: {},
    radar: {
      indicator: intern.abilityScores.map(a => ({
        name: a.dimension,
        max: 100,
      })),
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: intern.abilityScores.map(a => a.score),
            name: intern.basicInfo.name,
            areaStyle: {
              color: 'rgba(79, 109, 189, 0.15)',
            },
            lineStyle: {
              color: '#4f6dbd',
            },
            itemStyle: {
              color: '#4f6dbd',
            },
          },
        ],
      },
    ],
  }), [intern.abilityScores, intern.basicInfo.name]);

  // Merge historical + forecast data for chart
  const allWeeks = useMemo(() => {
    const historical = intern.trendData.map(t => t.week);
    const forecastWeeks = forecast?.map(f => f.week) ?? [];
    return [...historical, ...forecastWeeks];
  }, [intern.trendData, forecast]);

  // 趋势图配置（含预测虚线）
  const trendOption = useMemo(() => {
    const historical = intern.trendData;
    const f = forecast ?? [];
    const series: Array<Record<string, unknown>> = [
      {
        name: '适岗度',
        type: 'line',
        data: [...historical.map(t => t.fitScore), ...f.map(x => ({ value: x.fitScore, symbol: 'emptyCircle' }))],
        itemStyle: { color: '#4f6dbd' },
        lineStyle: { width: 2 },
      },
      {
        name: '风险度',
        type: 'line',
        data: [...historical.map(t => t.riskScore), ...f.map(x => ({ value: x.riskScore, symbol: 'emptyCircle' }))],
        itemStyle: { color: '#d94b4b' },
        lineStyle: { width: 2 },
      },
      {
        name: '高潜度',
        type: 'line',
        data: [...historical.map(t => t.potentialScore), ...f.map(x => ({ value: x.potentialScore, symbol: 'emptyCircle' }))],
        itemStyle: { color: '#3b9f6b' },
        lineStyle: { width: 2 },
      },
      {
        name: '任务完成率',
        type: 'line',
        data: historical.map(t => t.taskCompletionRate),
        itemStyle: { color: '#cc785c' },
        lineStyle: { width: 2 },
      },
    ];

    // Add forecast dashed line overlays for the first 3 metrics
    if (f.length > 0) {
      series.push(
        {
          name: '适岗度预测',
          type: 'line',
          data: [...Array(historical.length).fill(null), ...f.map(x => x.fitScore)],
          itemStyle: { color: '#4f6dbd' },
          lineStyle: { type: 'dashed', width: 2 },
          symbol: 'none',
          silent: true,
        },
        {
          name: '风险度预测',
          type: 'line',
          data: [...Array(historical.length).fill(null), ...f.map(x => x.riskScore)],
          itemStyle: { color: '#d94b4b' },
          lineStyle: { type: 'dashed', width: 2 },
          symbol: 'none',
          silent: true,
        },
        {
          name: '高潜度预测',
          type: 'line',
          data: [...Array(historical.length).fill(null), ...f.map(x => x.potentialScore)],
          itemStyle: { color: '#3b9f6b' },
          lineStyle: { type: 'dashed', width: 2 },
          symbol: 'none',
          silent: true,
        }
      );
    }

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['适岗度', '风险度', '高潜度', '任务完成率', ...(f.length > 0 ? ['适岗度预测', '风险度预测', '高潜度预测'] : [])],
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: allWeeks,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
        },
      },
      yAxis: { type: 'value', max: 100 },
      series,
    };
  }, [intern.trendData, forecast, allWeeks]);

  // 计算入职天数
  const entryDate = new Date(intern.basicInfo.entryDate);
  const now = new Date();
  const daysSinceEntry = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div>
      <FlowStage current="track" />
      {/* 返回按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/interns">
          <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
        </Link>
      </div>

      {/* 基础信息卡片 */}
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Space size="large">
              <div>
                <Title level={3} style={{ margin: 0 }}>{intern.basicInfo.name}</Title>
                <Text type="secondary">
                  {intern.basicInfo.position} · {intern.basicInfo.department}
                </Text>
              </div>
              <div>
                <Tag color={intern.riskLevel === '高' ? 'red' : intern.riskLevel === '中' ? 'orange' : 'green'}>
                  {intern.riskLevel}风险
                </Tag>
                {intern.potentialType && (
                  <Tag color="blue">{intern.potentialType}</Tag>
                )}
                <Tag color="volcano">{intern.basicInfo.phase}</Tag>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              {intern.tags.map((tag, index) => {
                const isPositive = ['学习速度快', '主动性强', '代码质量高', '转正潜力高'].includes(tag);
                const isNegative = ['任务延期', '情绪波动', '反馈偏少'].includes(tag);
                return (
                  <Tag
                    key={index}
                    color={isPositive ? 'green' : isNegative ? 'red' : 'default'}
                  >
                    {tag}
                  </Tag>
                );
              })}
            </Space>
          </Col>
        </Row>

        <Divider />

        <Descriptions column={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
          <Descriptions.Item label="学校">{intern.basicInfo.school}</Descriptions.Item>
          <Descriptions.Item label="专业">{intern.basicInfo.major}</Descriptions.Item>
          <Descriptions.Item label="导师">{intern.basicInfo.mentor}</Descriptions.Item>
          <Descriptions.Item label="入职天数">{daysSinceEntry}天</Descriptions.Item>
          <Descriptions.Item label="入职日期">
            {entryDate.toLocaleDateString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="任务完成率">
            <Progress percent={intern.taskCompletionRate} size="small" style={{ width: 100 }} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 决策摘要卡 — 评审一眼看到关键判断 */}
      <Card
        variant="borderless"
        style={{
          marginBottom: 16,
          borderLeft: `4px solid ${intern.scores.riskScore > 60 ? '#d94b4b' : intern.scores.riskScore > 30 ? '#d99a2b' : '#3b9f6b'}`,
          background: intern.scores.riskScore > 60 ? '#fdf0ef' : intern.scores.riskScore > 30 ? '#fdf6e6' : '#eef8f2',
        }}
      >
        <Row gutter={[16, 12]}>
          <Col xs={24} md={8}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5 }}>AI 风险结论</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: intern.scores.riskScore > 60 ? '#d94b4b' : intern.scores.riskScore > 30 ? '#d99a2b' : '#3b9f6b', lineHeight: 1.4 }}>
              {intern.aiExplanation.conclusion}
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5 }}>关键信号</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {intern.aiExplanation.signals.slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--risk-high)', flexShrink: 0 }} />
                  {s}
                </div>
              ))}
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5 }}>推荐动作</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {intern.aiExplanation.actions.slice(0, 3).map((a, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--ai)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined style={{ fontSize: 12, flexShrink: 0 }} />
                  {a}
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 核心评分卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card variant="borderless">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>适岗度</div>
              <Progress
                type="circle"
                percent={intern.scores.fitScore}
                size={120}
                status={intern.scores.fitScore >= 80 ? 'success' : intern.scores.fitScore >= 60 ? 'normal' : 'exception'}
                format={percent => (
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{percent}</span>
                )}
              />
              <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
                {intern.scores.fitScore >= 80 ? '优秀' : intern.scores.fitScore >= 60 ? '良好' : '需提升'}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>风险度</div>
              <Progress
                type="circle"
                percent={intern.scores.riskScore}
                size={120}
                status={intern.scores.riskScore <= 30 ? 'success' : intern.scores.riskScore <= 60 ? 'normal' : 'exception'}
                format={percent => (
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{percent}</span>
                )}
              />
              <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
                {intern.scores.riskScore <= 30 ? '低风险' : intern.scores.riskScore <= 60 ? '中风险' : '高风险'}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>高潜度</div>
              <Progress
                type="circle"
                percent={intern.scores.potentialScore}
                size={120}
                status={intern.scores.potentialScore >= 80 ? 'success' : intern.scores.potentialScore >= 60 ? 'normal' : 'exception'}
                format={percent => (
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{percent}</span>
                )}
              />
              <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
                {intern.scores.potentialScore >= 80 ? '高潜' : intern.scores.potentialScore >= 60 ? '中潜' : '一般'}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 能力雷达图和趋势图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="能力雷达图" variant="borderless">
            <ChartWithFallback
              height={300}
              fallback={
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {intern.abilityScores.map(a => (
                    <div key={a.dimension} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink)', width: 56, textAlign: 'right' }}>{a.dimension}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${a.score}%`, background: '#4f6dbd', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4f6dbd', minWidth: 28 }}>{a.score}</span>
                    </div>
                  ))}
                </div>
              }
            >
              <ReactECharts option={radarOption} style={{ height: 300 }} />
            </ChartWithFallback>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                趋势变化
                {forecast && forecast.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#8e8b82', background: '#f5f0e8', padding: '2px 8px', borderRadius: 10 }}>
                    AI 预测已叠加（虚线）
                  </span>
                )}
                {forecastLoading && (
                  <span style={{ fontSize: 12, color: '#8e8b82' }}>预测加载中...</span>
                )}
              </span>
            }
            variant="borderless"
          >
            <ChartWithFallback
              height={300}
              fallback={
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {intern.trendData.slice(-4).map(t => (
                    <div key={t.week} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: 'var(--muted)', width: 50 }}>{new Date(t.week).getMonth() + 1}/{new Date(t.week).getDate()}</span>
                      <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.fitScore}%`, background: '#4f6dbd', borderRadius: 3 }} />
                        </div>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.riskScore}%`, background: '#d94b4b', borderRadius: 3 }} />
                        </div>
                      </div>
                      <span style={{ color: '#4f6dbd', minWidth: 24 }}>{t.fitScore}</span>
                      <span style={{ color: '#d94b4b', minWidth: 24 }}>{t.riskScore}</span>
                    </div>
                  ))}
                </div>
              }
            >
              <ReactECharts option={trendOption} style={{ height: 300 }} />
            </ChartWithFallback>
          </Card>
        </Col>
      </Row>

      {/* 岗位匹配分析 */}
      <Card title="岗位匹配分析" variant="borderless" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>岗位要求</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {intern.positionAnalysis.requirements.map((req, index) => (
                  <li key={index} style={{ marginBottom: 4 }}>{req}</li>
                ))}
              </ul>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>当前表现</Text>
              <div style={{ marginTop: 8 }}>
                {intern.positionAnalysis.currentPerformance.map((perf, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Space>
                      <span>{perf.dimension}</span>
                      <Progress
                        percent={perf.score}
                        size="small"
                        style={{ width: 100 }}
                        status={perf.status === 'strong' ? 'success' : perf.status === 'moderate' ? 'normal' : 'exception'}
                      />
                      <Tag
                        color={perf.status === 'strong' ? 'green' : perf.status === 'moderate' ? 'orange' : 'red'}
                      >
                        {perf.status === 'strong' ? '优秀' : perf.status === 'moderate' ? '一般' : '需提升'}
                      </Tag>
                    </Space>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
        <Alert
          title="AI分析结论"
          description={intern.positionAnalysis.aiConclusion}
          type="info"
          showIcon
        />
      </Card>

      {/* AI 解释链（折叠展示，关键信息已在决策摘要卡中） */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: 'var(--ai)' }} />
            <span>AI 分析链路</span>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>(详细推理过程)</Text>
          </Space>
        }
        variant="borderless"
        style={{ marginBottom: 16 }}
        styles={{ body: { paddingTop: 0 } }}
      >
        <Row gutter={[16, 12]}>
          {/* 信号 + 依据 — 紧凑两列 */}
          <Col xs={24} md={12}>
            <div style={{ background: 'var(--surface-soft)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>输入信号</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {intern.aiExplanation.signals.map((s, i) => (
                  <Tag key={i} color="default" style={{ fontSize: 11 }}>{s}</Tag>
                ))}
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ background: 'var(--surface-soft)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>判断依据</div>
              {intern.aiExplanation.reasoning.map((r, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 3, color: 'var(--ink)' }}>· {r}</div>
              ))}
            </div>
          </Col>
          {/* 结论 + 动作 — 紧凑两列 */}
          <Col xs={24} md={12}>
            <div style={{
              background: intern.scores.riskScore > 60 ? '#fdf0ef' : intern.scores.riskScore > 30 ? '#fdf6e6' : '#eef8f2',
              borderRadius: 8, padding: 12,
              border: `1px solid ${intern.scores.riskScore > 60 ? '#f5c6c2' : intern.scores.riskScore > 30 ? '#f0dda0' : '#b8e0c8'}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>风险结论</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: intern.scores.riskScore > 60 ? '#d94b4b' : intern.scores.riskScore > 30 ? '#d99a2b' : '#3b9f6b' }}>
                {intern.aiExplanation.conclusion}
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ background: 'var(--ai-soft)', borderRadius: 8, padding: 12, border: '1px solid var(--hairline)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>推荐动作</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {intern.aiExplanation.actions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--ai)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircleOutlined style={{ fontSize: 11, flexShrink: 0 }} />{a}
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 周报摘要 */}
      <Card title="周报AI摘要" variant="borderless" style={{ marginBottom: 16 }}>
        {intern.weeklyReports.length > 0 ? (
          <Timeline
            items={intern.weeklyReports.map(report => {
              const emotionIcon = report.emotionSignal === '积极'
                ? <SmileOutlined style={{ color: '#3b9f6b', fontSize: 14 }} />
                : report.emotionSignal === '消极'
                  ? <FrownOutlined style={{ color: '#d94b4b', fontSize: 14 }} />
                  : <MehOutlined style={{ color: '#d99a2b', fontSize: 14 }} />;
              return {
                icon: emotionIcon,
                content: (
                  <div style={{
                    padding: report.needsHelp ? '10px 14px' : undefined,
                    background: report.needsHelp ? '#fdf0ef' : undefined,
                    borderRadius: report.needsHelp ? 8 : undefined,
                    border: report.needsHelp ? '1px solid #f5c6c2' : undefined,
                  }}>
                    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(report.weekStart).toLocaleDateString('zh-CN')} 周报
                      </Text>
                      <Tag
                        color={report.emotionSignal === '积极' ? 'green' : report.emotionSignal === '消极' ? 'red' : 'default'}
                        style={{ fontSize: 11, margin: 0 }}
                      >
                        {report.emotionSignal}
                      </Tag>
                      {report.needsHelp && (
                        <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>
                          需要帮助
                        </Tag>
                      )}
                    </div>
                    <Paragraph style={{ margin: 0, fontSize: 13 }}>{report.aiSummary}</Paragraph>
                    {report.difficulties && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--risk-mid)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <ExclamationCircleOutlined style={{ marginTop: 3, flexShrink: 0 }} />
                        <span>困难：{report.difficulties}</span>
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        ) : (
          <Text type="secondary">暂无周报数据</Text>
        )}
      </Card>

      {/* 导师反馈 */}
      <Card title="导师反馈" variant="borderless" style={{ marginBottom: 16 }}>
        {intern.mentorFeedbacks.length > 0 ? (
          <Timeline
            items={intern.mentorFeedbacks.map(feedback => {
              const perfColor = feedback.performance >= 4 ? '#3b9f6b' : feedback.performance >= 3 ? '#d99a2b' : '#d94b4b';
              const perfIcon = feedback.performance >= 4
                ? <SmileOutlined style={{ color: perfColor, fontSize: 14 }} />
                : feedback.performance >= 3
                  ? <MehOutlined style={{ color: perfColor, fontSize: 14 }} />
                  : <FrownOutlined style={{ color: perfColor, fontSize: 14 }} />;
              return {
                icon: perfIcon,
                content: (
                  <div style={{
                    padding: feedback.needsHR ? '10px 14px' : undefined,
                    background: feedback.needsHR ? '#fdf0ef' : undefined,
                    borderRadius: feedback.needsHR ? 8 : undefined,
                    border: feedback.needsHR ? '1px solid #f5c6c2' : undefined,
                  }}>
                    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(feedback.weekStart).toLocaleDateString('zh-CN')} · {feedback.mentorName}
                      </Text>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 11, fontWeight: 600, color: perfColor,
                        background: perfColor + '14', padding: '1px 8px', borderRadius: 10,
                      }}>
                        {feedback.performance}分
                      </span>
                      {feedback.needsHR && (
                        <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>
                          需HR介入
                        </Tag>
                      )}
                    </div>
                    <Paragraph style={{ margin: 0, fontSize: 13 }}>{feedback.comment}</Paragraph>
                    {feedback.strengths && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--risk-low)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <CheckCircleOutlined style={{ marginTop: 3, flexShrink: 0 }} />
                        <span>优势：{feedback.strengths}</span>
                      </div>
                    )}
                    {feedback.concerns && (
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--risk-mid)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        <ExclamationCircleOutlined style={{ marginTop: 3, flexShrink: 0 }} />
                        <span>担忧：{feedback.concerns}</span>
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        ) : (
          <Text type="secondary">暂无导师反馈</Text>
        )}
      </Card>

      {/* 风险预警 */}
      {intern.riskAlerts.length > 0 && (
        <Card title="风险预警" variant="borderless">
          {intern.riskAlerts.map(alert => (
            <Alert
              key={alert.id}
              title={`${alert.type}风险 - ${alert.level}级`}
              description={
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>触发原因：</Text>
                    <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                      {alert.reason.map((r, index) => (
                        <li key={index}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <Text strong>推荐动作：</Text>
                    <Text>{alert.action}</Text>
                  </div>
                </div>
              }
              type={alert.level === '高' ? 'error' : alert.level === '中' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 12 }}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
