'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { App, Card, Table, Tag, Button, Progress, Popover } from 'antd';
import {
  WarningOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import { FlowStage } from '@/components/flow-stage';

interface AlertItem {
  id: string;
  internId: string;
  internName: string;
  internSchool: string;
  position: string;
  mentor: string;
  fitScore: number;
  riskScore: number;
  type: string;
  level: string;
  reason: string[];
  action: string;
  createdAt: string;
}

const FALLBACK_ALERTS: AlertItem[] = [
  { id: 'alert-001', internId: 'demo-001', internName: '张晨', internSchool: '浙江大学', position: '研发实习生', mentor: '王建国', fitScore: 52, riskScore: 78, type: '能力错配', level: '高', reason: ['连续两周任务延期', '核心模块联调失败率高', '周报中出现消极情绪'], action: '安排导师1v1沟通，降低任务复杂度', createdAt: '2026-05-28T10:00:00Z' },
  { id: 'alert-002', internId: 'demo-005', internName: '刘子轩', internSchool: '中山大学', position: '销售实习生', mentor: '林晓峰', fitScore: 45, riskScore: 72, type: '情绪压力', level: '高', reason: ['周报出现迷茫表达', '任务完成率持续走低', '团队互动明显减少'], action: 'HR关怀沟通，调整任务节奏', createdAt: '2026-05-27T14:00:00Z' },
  { id: 'alert-003', internId: 'demo-004', internName: '赵雨萱', internSchool: '复旦大学', position: '产品实习生', mentor: '陈思远', fitScore: 63, riskScore: 58, type: '低投入', level: '中', reason: ['周报内容过于简略', '主动反馈频率下降'], action: '导师明确下周任务目标', createdAt: '2026-05-26T09:00:00Z' },
  { id: 'alert-004', internId: 'demo-001', internName: '张晨', internSchool: '浙江大学', position: '研发实习生', mentor: '王建国', fitScore: 52, riskScore: 78, type: '融入', level: '中', reason: ['很少主动提问', '团队例会参与度低'], action: '安排团队buddy，增加非正式沟通', createdAt: '2026-05-25T16:00:00Z' },
  { id: 'alert-005', internId: 'demo-005', internName: '刘子轩', internSchool: '中山大学', position: '销售实习生', mentor: '林晓峰', fitScore: 45, riskScore: 72, type: '留用', level: '中', reason: ['归属感下降', '对岗位兴趣减弱'], action: '了解职业兴趣变化，提供发展路径说明', createdAt: '2026-05-24T11:00:00Z' },
  { id: 'alert-006', internId: 'demo-004', internName: '赵雨萱', internSchool: '复旦大学', position: '产品实习生', mentor: '陈思远', fitScore: 63, riskScore: 58, type: '能力错配', level: '中', reason: ['需求文档多次返工', '用户调研方法不清晰'], action: '安排同岗位伙伴辅导', createdAt: '2026-05-23T15:00:00Z' },
];

const riskTypePopoverData = [
  { type: '低投入', title: '低投入风险', desc: '任务完成率低、周报敷衍、主动反馈少' },
  { type: '能力错配', title: '能力错配风险', desc: '多次任务延期、核心能力分低、反复返工' },
  { type: '融入', title: '融入风险', desc: '协作少、很少主动提问、团队互动不足' },
  { type: '情绪压力', title: '情绪压力风险', desc: '周报出现焦虑/迷茫、任务质量突降' },
  { type: '留用', title: '留用风险', desc: '能力不错但归属感低、兴趣下降' },
];

const actionMap: Record<string, string[]> = {
  '低投入': ['导师明确下周任务目标', 'HR确认学生是否理解岗位要求', '要求学生提交更具体周计划'],
  '能力错配': ['降低任务复杂度', '安排同岗位伙伴辅导', '补充基础能力学习材料'],
  '融入': ['安排团队buddy', '增加一次非正式沟通', '鼓励参与小组例会汇报'],
  '情绪压力': ['HR进行关怀沟通', '导师调整任务节奏', '明确"不会因短期卡点否定整体表现"'],
  '留用': ['了解职业兴趣变化', '提供岗位发展路径说明', '安排优秀前辈交流'],
};

function getPositionLabel(position: string) {
  return position.replace('实习生', '');
}

export default function AlertsPage() {
  const { message } = App.useApp();
  const [alerts, setAlerts] = useState<AlertItem[]>(FALLBACK_ALERTS);
  const [loading, setLoading] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback((skipCache?: boolean) => {
    setLoading(true);
    fetchJson<AlertItem[]>('/api/alerts', {
      fallback: FALLBACK_ALERTS,
      validate: (d): d is AlertItem[] => Array.isArray(d),
      timeoutMs: 6000,
      skipCache,
    }).then(({ data }) => {
      setAlerts(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = useCallback((alertId: string) => {
    setResolvedIds(prev => new Set(prev).add(alertId));
    message.success('已标记为处理中');
    fetch(`/api/alerts/${alertId}`, { method: 'PATCH' })
      .then(res => res.json())
      .then(() => {
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== alertId));
          setResolvedIds(prev => {
            const next = new Set(prev);
            next.delete(alertId);
            return next;
          });
        }, 500);
      })
      .catch(err => {
        console.error('处理预警失败:', err);
        setResolvedIds(prev => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
      });
  }, [message]);

  const stats = useMemo(() => {
    const active = alerts.filter(a => !resolvedIds.has(a.id));
    const high = active.filter(a => a.level === '高');
    const mid = active.filter(a => a.level === '中');
    return {
      highCount: high.length,
      midCount: mid.length,
      total: active.length,
    };
  }, [alerts, resolvedIds]);

  const highestRiskInternId = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => b.riskScore - a.riskScore);
    return sorted[0]?.internId;
  }, [alerts]);

  const renderRiskIcon = (type: string) => {
    const style = { fontSize: 15, color: 'var(--ai)', marginTop: 1 };
    if (type === '能力错配') return <WarningOutlined style={{ ...style, color: 'var(--risk-high)' }} />;
    if (type === '情绪压力') return <ExclamationCircleOutlined style={{ ...style, color: 'var(--risk-mid)' }} />;
    if (type === '留用') return <CheckCircleOutlined style={{ ...style, color: 'var(--risk-low)' }} />;
    if (type === '低投入') return <FileTextOutlined style={style} />;
    return <RocketOutlined style={style} />;
  };

  const riskPopoverContent = (
    <div style={{ width: 'min(400px, calc(100vw - 48px))' }}>
      {riskTypePopoverData.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 0',
            borderBottom: i < riskTypePopoverData.length - 1 ? '1px solid var(--hairline)' : 'none',
          }}
        >
          {renderRiskIcon(item.type)}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const columns = useMemo(() => [
    {
      title: '实习生',
      dataIndex: 'internName',
      key: 'internName',
      width: 150,
      render: (name: string, record: AlertItem) => (
        <div>
          <Link href={`/interns/${record.internId}`} style={{ color: 'var(--ai)', fontWeight: 500, fontSize: 13 }}>
            {name}
          </Link>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{record.internSchool}</div>
        </div>
      ),
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      width: 90,
      render: (position: string) => <Tag color="volcano" style={{ fontSize: 12 }}>{getPositionLabel(position)}</Tag>,
    },
    {
      title: '风险类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeColors: Record<string, string> = {
          '低投入': 'orange',
          '能力错配': 'red',
          '融入': 'cyan',
          '情绪压力': 'gold',
          '留用': 'green',
        };
        return <Tag color={typeColors[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: '风险等级',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (level: string) => (
        <Tag
          color={level === '高' ? 'red' : level === '中' ? 'orange' : 'green'}
          icon={level === '高' ? <ExclamationCircleOutlined /> : undefined}
          style={{ fontWeight: 500 }}
        >
          {level}风险
        </Tag>
      ),
    },
    {
      title: '关键触发信号',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      ellipsis: true,
      render: (reason: string[]) => (
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          {reason.slice(0, 2).map((r, i) => (
            <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              · {r}
            </div>
          ))}
          {reason.length > 2 && (
            <span style={{ color: 'var(--ai)', fontSize: 11 }}>+{reason.length - 2}条</span>
          )}
        </div>
      ),
    },
    {
      title: '适岗度',
      dataIndex: 'fitScore',
      key: 'fitScore',
      width: 120,
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={score}
            size="small"
            showInfo={false}
            strokeColor={score >= 80 ? 'var(--risk-low)' : score >= 60 ? 'var(--risk-mid)' : 'var(--risk-high)'}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: score >= 80 ? 'var(--risk-low)' : score >= 60 ? 'var(--risk-mid)' : 'var(--risk-high)', minWidth: 30, textAlign: 'right' }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: '风险度',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 120,
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={score}
            size="small"
            showInfo={false}
            strokeColor={score <= 30 ? 'var(--risk-low)' : score <= 60 ? 'var(--risk-mid)' : 'var(--risk-high)'}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: score <= 30 ? 'var(--risk-low)' : score <= 60 ? 'var(--risk-mid)' : 'var(--risk-high)', minWidth: 30, textAlign: 'right' }}>
            {score}
          </span>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'operation',
      width: 210,
      fixed: 'right' as const,
      render: (_: unknown, record: AlertItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href={`/interventions/${record.internId}`}>
            <Button type="primary" size="small" icon={<ThunderboltOutlined />}>
              生成方案
            </Button>
          </Link>
          <Link href={`/interns/${record.internId}`}>
            <Button size="small">详情</Button>
          </Link>
          <Button
            type="link"
            size="small"
            style={{ color: 'var(--muted)', fontSize: 12 }}
            onClick={() => handleResolve(record.id)}
          >
            标记处理
          </Button>
        </div>
      ),
    },
  ], [handleResolve]);

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <FlowStage current="alert" />
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningOutlined style={{ color: 'var(--risk-high)' }} />
          风险预警
        </h2>
        <Popover content={riskPopoverContent} title="风险类型说明" trigger={['hover', 'click']} placement="bottomLeft">
          <QuestionCircleOutlined
            style={{ fontSize: 16, color: 'var(--muted)', cursor: 'help' }}
          />
        </Popover>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={() => fetchAlerts(true)} size="small">
          刷新
        </Button>
      </div>

      {/* 顶部指标卡 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 16,
      }} className="alert-stats-grid">
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--risk-high)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>高风险预警</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-high)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {stats.highCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>需立即处理</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--risk-high-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ExclamationCircleOutlined style={{ fontSize: 20, color: 'var(--risk-high)' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--risk-mid)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>中风险预警</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-mid)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {stats.midCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>需关注跟进</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--risk-mid-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WarningOutlined style={{ fontSize: 20, color: 'var(--risk-mid)' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--ai)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>今日需处理</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ai)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>活跃预警总数</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--ai-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileTextOutlined style={{ fontSize: 20, color: 'var(--ai)' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--risk-low)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>可生成方案</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-low)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>AI干预方案</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--risk-low-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 20, color: 'var(--risk-low)' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* AI 建议条 */}
      {alerts.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--ai-soft)',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #d4ccf5',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <RocketOutlined style={{ color: 'var(--ai)', fontSize: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>
              AI 建议优先处理 <strong style={{ color: 'var(--risk-high)' }}>{stats.highCount} 名高风险对象</strong>，
              重点关注任务延期与留用风险。
            </span>
          </div>
          {highestRiskInternId && (
            <Link href={`/interventions/${highestRiskInternId}`}>
              <Button type="primary" size="small" icon={<ThunderboltOutlined />}>
                开始处理最高风险
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* 活跃预警列表 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>活跃预警处置队列</span>
            <Tag color="var(--ai)" style={{ fontSize: 11 }}>{alerts.length}</Tag>
          </div>
        }
        variant="borderless"
        data-demo="alerts-table"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={alerts}
          columns={columns}
          rowKey="id"
          rowClassName={(record) =>
            `${resolvedIds.has(record.id) ? 'alert-resolving' : ''} ${record.level === '高' ? 'alert-row-high' : ''}`
          }
          loading={loading}
          scroll={{ x: 1050 }}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条预警`,
            size: 'small',
          }}
          expandable={{
            expandedRowRender: (record) => (
              <div className="alert-expanded-panel">
                <div className="alert-expanded-card">
                  <div className="panel-kicker">带教责任人</div>
                  <div className="panel-title">{record.mentor}</div>
                  <div className="panel-meta">风险度评分 <strong>{record.riskScore}</strong></div>
                </div>
                <div className="alert-expanded-card">
                  <div className="panel-kicker">关键触发信号</div>
                  <div className="signal-stack">
                    {record.reason.map((r, index) => (
                      <span key={index}>{r}</span>
                    ))}
                  </div>
                </div>
                <div className="alert-expanded-card">
                  <div className="panel-kicker">推荐动作</div>
                  <div className="panel-title">{record.action}</div>
                  <div className="action-stack">
                    {actionMap[record.type]?.map((action, index) => (
                      <span key={index}>{action}</span>
                    ))}
                  </div>
                </div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
