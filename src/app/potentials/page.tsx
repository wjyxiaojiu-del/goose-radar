'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Tag,
  Button,
  Progress,
  Popover,
  Table,
  Grid,
} from 'antd';
import {
  StarOutlined,
  ReloadOutlined,
  RiseOutlined,
  TrophyOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
const { useBreakpoint } = Grid;

import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import { ChartWithFallback } from '@/components/chart-with-fallback';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="chart-skeleton" />,
});

interface PotentialIntern {
  id: string;
  name: string;
  gender: string;
  school: string;
  major: string;
  position: string;
  mentor: string;
  fitScore: number;
  riskScore: number;
  potentialScore: number;
  tags: string[];
  potentialType: string;
  taskCompletionRate: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  reasons: string[];
  latestReport: string;
  latestFeedback: string;
}

interface PotentialsData {
  interns: PotentialIntern[];
  dimensions: Array<{
    name: string;
    description: string;
    weight: number;
  }>;
  typeDescriptions: Record<string, {
    description: string;
    suggestion: string[];
  }>;
}

const FALLBACK_POTENTIALS: PotentialsData = {
  interns: [
    { id: 'demo-002', name: '李安然', gender: '女', school: '北京大学', major: '产品设计', position: '产品实习生', mentor: '陈思远', fitScore: 88, riskScore: 15, potentialScore: 92, tags: ['学习速度快', '主动性强', '产品sense强'], potentialType: '快速成长型', taskCompletionRate: 95, growthTrend: 'rising', reasons: ['产品sense强', '主动承担跨部门协调', '用户调研报告质量高'], latestReport: '完成竞品分析报告，提出3个创新功能点', latestFeedback: '超出预期，建议加入重点培养池' },
    { id: 'demo-006', name: '陈思琪', gender: '女', school: '武汉大学', major: '人工智能', position: '研发实习生', mentor: '王建国', fitScore: 85, riskScore: 20, potentialScore: 90, tags: ['主动性强', '代码质量高', '转正潜力高'], potentialType: '综合优秀型', taskCompletionRate: 92, growthTrend: 'rising', reasons: ['推荐算法原型准确率提升12%', '代码Review通过率100%', '主动分享技术文档'], latestReport: '完成推荐算法原型，准确率提升12%', latestFeedback: '表现优秀，建议提前启动转正评估' },
    { id: 'demo-003', name: '王浩然', gender: '男', school: '上海交通大学', major: '软件工程', position: '研发实习生', mentor: '王建国', fitScore: 71, riskScore: 35, potentialScore: 78, tags: ['学习速度快', '代码质量高'], potentialType: '高质量交付型', taskCompletionRate: 82, growthTrend: 'stable', reasons: ['独立完成用户模块重构', '代码质量稳定'], latestReport: '独立完成用户模块重构', latestFeedback: '代码质量稳定，可以承担更多责任' },
  ],
  dimensions: [
    { name: '任务完成率', description: '按时交付且通过验收的任务占比', weight: 25 },
    { name: '学习速度', description: '新技能和业务知识的掌握速度', weight: 20 },
    { name: '主动反馈', description: '周报质量和主动沟通频率', weight: 15 },
    { name: '代码/产出质量', description: '返工率、Review通过率、用户满意度', weight: 20 },
    { name: '协作与影响力', description: '跨团队协作、知识分享、带动他人', weight: 10 },
    { name: '成长趋势', description: '连续数周的指标变化方向', weight: 10 },
  ],
  typeDescriptions: {
    '快速成长型': { description: '学习曲线陡峭，新技能掌握快，适应力强', suggestion: ['安排挑战任务', '加入重点培养池'] },
    '综合优秀型': { description: '各维度均衡突出，具备领导潜力', suggestion: ['参与业务决策讨论', '安排跨团队项目'] },
    '高质量交付型': { description: '产出质量稳定，代码/文档通过率高', suggestion: ['增加导师反馈频率', '安排独立模块'] },
  },
};

const recommendedActions: Record<string, string> = {
  '快速成长型': '安排挑战任务',
  '主动探索型': '加入重点培养池',
  '高质量交付型': '增加导师反馈频率',
  '协作推进型': '安排跨团队项目',
  '业务敏感型': '参与业务决策讨论',
  '综合优秀型': '加入重点培养池',
};

function getPositionLabel(position: string) {
  return position.replace('实习生', '');
}

export default function PotentialsPage() {
  const [data, setData] = useState<PotentialsData>(FALLBACK_POTENTIALS);
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchPotentials = useCallback((skipCache?: boolean) => {
    setLoading(true);
    fetchJson<PotentialsData>('/api/potentials', {
      fallback: FALLBACK_POTENTIALS,
      validate: (d): d is PotentialsData => !!d && typeof d === 'object' && 'interns' in d,
      timeoutMs: 6000,
      skipCache,
    }).then(({ data }) => {
      setData(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPotentials();
  }, [fetchPotentials]);

  const typeDistribution = useMemo(() => {
    if (!data) return {};
    return data.interns.reduce((acc, intern) => {
      acc[intern.potentialType] = (acc[intern.potentialType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  const positionDistribution = useMemo(() => {
    if (!data) return {};
    return data.interns.reduce((acc, intern) => {
      acc[intern.position] = (acc[intern.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  const risingCount = useMemo(() => data?.interns.filter(i => i.growthTrend === 'rising').length || 0, [data]);

  const typePieOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{
      name: '高潜类型',
      type: 'pie',
      radius: ['35%', '65%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: Object.entries(typeDistribution).map(([name, value]) => ({ name, value })),
    }],
  }), [typeDistribution]);

  const positionBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: Object.keys(positionDistribution), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [{ type: 'bar', data: Object.values(positionDistribution), itemStyle: { color: '#cc785c', borderRadius: [4, 4, 0, 0] }, barWidth: '50%' }],
  }), [positionDistribution]);

  const getTrendTag = (trend: string) => {
    if (trend === 'rising') return <Tag color="green" style={{ fontSize: 11 }}>上升</Tag>;
    if (trend === 'declining') return <Tag color="red" style={{ fontSize: 11 }}>下降</Tag>;
    return <Tag color="default" style={{ fontSize: 11 }}>稳定</Tag>;
  };

  const getAction = (type: string) => recommendedActions[type] || '加入重点培养池';

  // Popover 内容：高潜判断维度 + 类型说明
  const popoverContent = (
    <div style={{ width: 'min(400px, calc(100vw - 48px))' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>识别口径</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, background: 'var(--surface-soft)', padding: '8px 10px', borderRadius: 6 }}>
          高潜综合评分 ≥ 80，或已被导师标记为特定高潜类型
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>判断维度</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {data.dimensions.map((dim, i) => (
            <div key={i} style={{ fontSize: 12, padding: '6px 8px', background: 'var(--surface-soft)', borderRadius: 6 }}>
              <span style={{ fontWeight: 500 }}>{dim.name}</span>
              <span style={{ color: 'var(--muted)', marginLeft: 4 }}>（{dim.weight}%）</span>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>{dim.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>高潜类型</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(data.typeDescriptions).map(([type, desc]) => (
            <div key={type} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--hairline)' }}>
              <Tag color="gold" style={{ flexShrink: 0, fontSize: 11 }}>{type}</Tag>
              <div>
                <div style={{ color: 'var(--ink)', lineHeight: 1.5 }}>{desc.description}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                  培养建议：{desc.suggestion.join('、')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 表格列定义
  const columns = useMemo(() => [
    {
      title: '实习生',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (name: string, record: PotentialIntern) => (
        <div>
          <Link href={`/interns/${record.id}`} style={{ color: 'var(--ai)', fontWeight: 500, fontSize: 13 }}>
            {name}
          </Link>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{record.school}</div>
        </div>
      ),
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      responsive: ['md'] as const,
      width: 90,
      render: (position: string) => <Tag color="volcano" style={{ fontSize: 12 }}>{getPositionLabel(position)}</Tag>,
    },
    {
      title: '潜力分',
      dataIndex: 'potentialScore',
      key: 'potentialScore',
      width: 110,
      sorter: (a: PotentialIntern, b: PotentialIntern) => a.potentialScore - b.potentialScore,
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={score}
            size="small"
            showInfo={false}
            strokeColor="var(--potential)"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--potential)', minWidth: 28, textAlign: 'right' }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: '适岗度',
      dataIndex: 'fitScore',
      key: 'fitScore',
      width: 110,
      sorter: (a: PotentialIntern, b: PotentialIntern) => a.fitScore - b.fitScore,
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={score}
            size="small"
            showInfo={false}
            strokeColor={score >= 80 ? 'var(--risk-low)' : score >= 60 ? 'var(--risk-mid)' : 'var(--risk-high)'}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: score >= 80 ? 'var(--risk-low)' : score >= 60 ? 'var(--risk-mid)' : 'var(--risk-high)', minWidth: 28, textAlign: 'right' }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: '高潜类型',
      dataIndex: 'potentialType',
      key: 'potentialType',
      responsive: ['md'] as const,
      width: 120,
      render: (type: string) => <Tag color="gold" style={{ fontSize: 12 }}>{type}</Tag>,
    },
    {
      title: '趋势',
      dataIndex: 'growthTrend',
      key: 'growthTrend',
      responsive: ['md'] as const,
      width: 70,
      render: (trend: string) => getTrendTag(trend),
    },
    {
      title: '推荐动作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: PotentialIntern) => (
        <span style={{ fontSize: 12, color: 'var(--ink)' }}>{getAction(record.potentialType)}</span>
      ),
    },
    {
      title: '操作',
      key: 'operation',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, record: PotentialIntern) => (
        <Link href={`/interns/${record.id}`}>
          <Button type="link" size="small">详情</Button>
        </Link>
      ),
    },
  ], []) as any[];

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <StarOutlined style={{ color: '#d99a2b' }} />
          高潜人才
        </h2>
        <Popover content={popoverContent} title="高潜判断维度与类型说明" trigger={['hover', 'click']} placement="bottomLeft">
          <QuestionCircleOutlined style={{ fontSize: 16, color: 'var(--muted)', cursor: 'help' }} />
        </Popover>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={() => fetchPotentials(true)} size="small">刷新</Button>
      </div>

      {/* 顶部指标卡 */}
      <div
        className="potential-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Card variant="borderless" style={{ borderLeft: '3px solid #d99a2b' }} styles={{ body: { padding: '10px 14px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>高潜人才总数</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d99a2b', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {data.interns.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>已识别人才</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fdf6e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrophyOutlined style={{ fontSize: 16, color: '#d99a2b' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--risk-low)' }} styles={{ body: { padding: '10px 14px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>上升趋势</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--risk-low)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {risingCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>持续成长中</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--risk-low-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RiseOutlined style={{ fontSize: 16, color: 'var(--risk-low)' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--potential)' }} styles={{ body: { padding: '10px 14px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>高潜类型</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--potential)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {Object.keys(typeDistribution).length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>类型多样性</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3eefc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TeamOutlined style={{ fontSize: 16, color: 'var(--potential)' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* 图表区域（缩小） */}
      <div className="potential-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card variant="borderless" title={<span style={{ fontSize: 14, fontWeight: 600 }}>高潜类型分布</span>} styles={{ body: { padding: '8px 12px' } }}>
          <ChartWithFallback
            height={240}
            fallback={
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(typeDistribution).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Tag color="gold" style={{ fontSize: 11, flexShrink: 0, margin: 0 }}>{type}</Tag>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${data.interns.length ? (count / data.interns.length) * 100 : 0}%`, background: '#d99a2b', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d99a2b', minWidth: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            }
          >
            <ReactECharts option={typePieOption} style={{ height: 240 }} />
          </ChartWithFallback>
        </Card>
        <Card variant="borderless" title={<span style={{ fontSize: 14, fontWeight: 600 }}>岗位分布</span>} styles={{ body: { padding: '8px 12px' } }}>
          <ChartWithFallback
            height={240}
            fallback={
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(positionDistribution).map(([pos, count]) => {
                  const name = pos.replace('实习生', '');
                  const maxVal = Math.max(...Object.values(positionDistribution), 1);
                  return (
                    <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink)', width: 32, textAlign: 'right' }}>{name}</span>
                      <div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / maxVal) * 100}%`, background: '#cc785c', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, minWidth: count > 0 ? 24 : 0 }}>
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          >
            <ReactECharts option={positionBarOption} style={{ height: 240 }} />
          </ChartWithFallback>
        </Card>
      </div>

      {/* 高潜人才列表 */}
      <Card
        variant="borderless"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RocketOutlined style={{ color: 'var(--potential)' }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>高潜人才列表</span>
            <Tag color="gold" style={{ fontSize: 11 }}>{data.interns.length}人</Tag>
          </div>
        }
        styles={{ body: { padding: 0 } }}
        data-demo="potentials-table"
      >
        <Table
          dataSource={data.interns}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading}
          scroll={{ x: isMobile ? 650 : 960 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 名高潜人才`,
            size: 'small',
          }}
          expandable={{
            expandedRowRender: (record) => (
              <div className="potential-expanded-panel">
                <div className="potential-expanded-card dark">
                  <div className="panel-kicker">带教与产出</div>
                  <div className="panel-title">{record.mentor}</div>
                  <div className="potential-score-row">
                    <span>任务完成率</span>
                    <strong>{record.taskCompletionRate}%</strong>
                  </div>
                  <div className="potential-score-row">
                    <span>成长趋势</span>
                    <strong>{record.growthTrend === 'rising' ? '上升' : record.growthTrend === 'declining' ? '下降' : '稳定'}</strong>
                  </div>
                </div>
                <div className="potential-expanded-card">
                  <div className="panel-kicker">推荐理由</div>
                  <div className="signal-stack">
                    {record.reasons.map((r, i) => <span key={i}>{r}</span>)}
                  </div>
                  <div className="potential-tags">
                    {record.tags.slice(0, 5).map((tag, i) => (
                      <Tag key={i} color="green" style={{ fontSize: 11 }}>{tag}</Tag>
                    ))}
                  </div>
                </div>
                <div className="potential-expanded-card accent">
                  <div className="panel-kicker">导师评价与培养动作</div>
                  <div className="panel-title">{getAction(record.potentialType)}</div>
                  <p className="potential-feedback">
                    {record.latestFeedback
                      ? record.latestFeedback.length > 140
                        ? record.latestFeedback.substring(0, 140) + '...'
                        : record.latestFeedback
                      : '建议保持高频反馈，安排可独立交付的挑战任务。'}
                  </p>
                </div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
