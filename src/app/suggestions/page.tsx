'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  App,
  Card,
  Tag,
  Button,
  Tabs,
  Progress,
  Tooltip,
} from 'antd';
import {
  BulbOutlined,
  ReloadOutlined,
  UserOutlined,
  TeamOutlined,
  RocketOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import { FlowStage } from '@/components/flow-stage';

interface SuggestionsData {
  aiStatus?: 'live' | 'cached-live' | 'cached-fallback' | 'fallback';
  hrActions: Array<{
    internId: string;
    internName: string;
    position: string;
    mentor: string;
    priority: string;
    reason: string;
    goal: string;
    method: string;
    suggestion: string;
  }>;
  mentorTemplates: Array<{
    title: string;
    questions: string[];
  }>;
  growthSuggestions: Array<{
    internId: string;
    internName: string;
    position: string;
    fitScore: number;
    riskScore: number;
    suggestions: string[];
  }>;
  nextWeekTasks: Record<string, string[]>;
}

const FALLBACK_SUGGESTIONS: SuggestionsData = {
  aiStatus: 'fallback',
  hrActions: [
    { internId: 'demo-001', internName: '张晨', position: '研发实习生', mentor: '王建国', priority: 'high', reason: '连续两周任务延期，周报出现消极情绪，核心模块联调失败率高', goal: '了解具体困难，确认是否存在任务理解或适应压力问题', method: '一对一沟通', suggestion: '建议HR本周优先与张晨沟通。任务完成率下降，周报中出现消极情绪表达。沟通目标不是考核，而是确认是否存在任务理解或适应压力问题。' },
    { internId: 'demo-005', internName: '刘子轩', position: '销售实习生', mentor: '林晓峰', priority: 'high', reason: '周报出现迷茫表达，任务完成率持续走低，团队互动明显减少', goal: '了解情绪状态，调整任务节奏，重建信心', method: '关怀沟通', suggestion: '建议HR与刘子轩进行一次非正式沟通，了解是否对岗位有疑虑。明确"不会因短期卡点否定整体表现"，帮助他把目标拆小。' },
  ],
  mentorTemplates: [
    { title: '了解任务困难', questions: ['你觉得最近最卡住的任务是哪一个？', '你觉得是背景信息不足，还是方法不清楚？', '哪些地方希望我给你更多反馈？'] },
    { title: '明确目标与支持', questions: ['下周你希望独立承担什么任务？', '我们可以把目标拆成哪两个小步骤？', '你觉得团队里谁可以帮你解答这类问题？'] },
    { title: '情绪与状态关注', questions: ['最近工作节奏适应吗？有没有觉得压力比较大的时候？', '你觉得目前的工作内容和你的预期一致吗？', '有什么我可以帮你调整的吗？'] },
  ],
  growthSuggestions: [
    { internId: 'demo-001', internName: '张晨', position: '研发实习生', fitScore: 52, riskScore: 78, suggestions: ['建议降低任务复杂度，先完成基础任务建立信心', '建议导师增加1v1频率，每周至少一次'] },
    { internId: 'demo-005', internName: '刘子轩', position: '销售实习生', fitScore: 45, riskScore: 72, suggestions: ['建议HR进行关怀沟通，了解情绪状态', '建议明确任务优先级，减少并行任务数量'] },
    { internId: 'demo-004', internName: '赵雨萱', position: '产品实习生', fitScore: 63, riskScore: 58, suggestions: ['建议导师明确下周任务目标', '建议要求学生提交更具体周计划'] },
  ],
  nextWeekTasks: {
    '研发实习生': ['修复1个低风险Bug', '完成1次代码Review', '输出模块学习笔记', '参与一次技术方案讨论'],
    '产品实习生': ['完成1份竞品分析', '参与1次需求评审', '输出1页用户反馈总结', '向导师复盘一次产品判断'],
    '销售实习生': ['整理10个客户线索', '旁听2次客户沟通', '模拟一次产品介绍', '输出客户异议清单'],
  },
};

function getPositionLabel(position: string) {
  return position.replace('实习生', '');
}

export default function SuggestionsPage() {
  return <SuggestionsContent />;
}

function SuggestionsContent() {
  const { message } = App.useApp();
  const [data, setData] = useState<SuggestionsData>(FALLBACK_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(FALLBACK_SUGGESTIONS.hrActions[0]?.internId ?? null);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback((skipCache?: boolean) => {
    setLoading(true);
    fetchJson<SuggestionsData>('/api/suggestions', {
      fallback: FALLBACK_SUGGESTIONS,
      validate: (d): d is SuggestionsData => !!d && typeof d === 'object' && 'hrActions' in d,
      timeoutMs: 8000,
      skipCache,
    }).then(({ data }) => {
      setData(data);
      if (data.hrActions?.length > 0 && !selectedId) {
        setSelectedId(data.hrActions[0].internId);
      }
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSuggestions();
  }, [fetchSuggestions]);

  // 合并所有实习生（去重）
  const allInterns = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: Array<{
      internId: string;
      internName: string;
      position: string;
      mentor: string;
      priority: string;
      reason: string;
      goal: string;
      method: string;
      suggestion: string;
      fitScore: number;
      riskScore: number;
      growthSuggestions: string[];
    }> = [];
    for (const a of data.hrActions) {
      if (!seen.has(a.internId)) {
        seen.add(a.internId);
        const growth = data.growthSuggestions.find(g => g.internId === a.internId);
        result.push({
          ...a,
          fitScore: growth?.fitScore ?? 0,
          riskScore: growth?.riskScore ?? 0,
          growthSuggestions: growth?.suggestions ?? [],
        });
      }
    }
    for (const g of data.growthSuggestions) {
      if (!seen.has(g.internId)) {
        seen.add(g.internId);
        result.push({
          internId: g.internId,
          internName: g.internName,
          position: g.position,
          mentor: '待分配',
          priority: 'medium',
          reason: g.suggestions[0] || '建议本周持续跟进成长状态',
          goal: '确认本周成长任务是否清晰，帮助学生把改进点拆成可完成的小步骤',
          method: '本周跟进',
          suggestion: `建议本周跟进${g.internName}，围绕“${g.suggestions[0] || '成长状态'}”确认具体困难，并约定一个可验收的小目标。`,
          fitScore: g.fitScore,
          riskScore: g.riskScore,
          growthSuggestions: g.suggestions,
        });
      }
    }
    return result;
  }, [data]);

  const highPriority = useMemo(() => allInterns.filter(a => a.priority === 'high'), [allInterns]);
  const mediumPriority = useMemo(() => allInterns.filter(a => a.priority === 'medium'), [allInterns]);

  const selectedIntern = useMemo(() => {
    if (!selectedId) return allInterns[0] || null;
    return allInterns.find(i => i.internId === selectedId) || allInterns[0] || null;
  }, [selectedId, allInterns]);

  // 生成材料计数
  const materialCount = useMemo(() => {
    if (!data) return 0;
    return (data.mentorTemplates?.length || 0) +
      (data.growthSuggestions?.reduce((acc, g) => acc + g.suggestions.length, 0) || 0) +
      Object.values(data.nextWeekTasks || {}).reduce((acc, tasks) => acc + tasks.length, 0);
  }, [data]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success(`${label}已复制到剪贴板`);
    }).catch(() => {
      message.info(`${label}复制失败，请手动复制`);
    });
  };

  const handleFollow = (internId: string, name: string) => {
    setFollowedIds(prev => new Set(prev).add(internId));
    message.success(`已标记 ${name} 本周跟进`);
  };

  // AI 状态标签
  const aiStatusLabel = data.aiStatus === 'live' ? 'MiMo LLM 生成'
    : data.aiStatus === 'cached-live' ? 'MiMo LLM 生成'
    : data.aiStatus === 'cached-fallback' ? '稳定方案缓存'
    : '规则兜底';
  const aiStatusColor = data.aiStatus === 'live' ? 'volcano'
    : data.aiStatus === 'cached-live' ? 'blue'
    : data.aiStatus === 'cached-fallback' ? 'orange'
    : 'default';
  const aiStatusTip = data.aiStatus === 'live' ? 'MiMo LLM 本次实时返回，内容为 AI 原创生成'
    : data.aiStatus === 'cached-live' ? '已命中最近一次 MiMo 生成结果，保证秒开'
    : data.aiStatus === 'cached-fallback' ? '模型响应超时，已启用经验证的稳定方案并缓存'
    : '模型暂不可用，启用基于规则的标准化方案';

  const selectedMentorTemplate = data.mentorTemplates[0];
  const selectedTaskList = selectedIntern
    ? data.nextWeekTasks[selectedIntern.position] || data.nextWeekTasks[`${getPositionLabel(selectedIntern.position)}实习生`] || []
    : [];

  // 材料库 Tabs
  const tabItems = [
    {
      key: 'mentor',
      label: <span><TeamOutlined /> 导师1v1提纲</span>,
      children: (
        <div>
          {data.mentorTemplates.map((template, index) => (
            <Card key={index} variant="borderless" style={{ marginBottom: 12 }} styles={{ body: { padding: 16 } }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{template.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {template.questions.map((q, qi) => (
                  <div key={qi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Tag color="blue" style={{ flexShrink: 0, marginTop: 2 }}>Q{qi + 1}</Tag>
                    <span style={{ fontSize: 13 }}>{q}</span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(q, '问题')}
                      style={{ flexShrink: 0, marginLeft: 'auto' }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'growth',
      label: <span><BulbOutlined /> 成长建议</span>,
      children: (
        <div>
          {data.growthSuggestions.map((s, index) => (
            <Card key={index} variant="borderless" style={{ marginBottom: 12 }} styles={{ body: { padding: 16 } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.internName}</span>
                <Tag color="blue" style={{ fontSize: 11 }}>{s.position}</Tag>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--muted)' }}>适岗度 </span>
                  <Progress percent={s.fitScore} size="small" style={{ width: 80, marginBottom: 0 }} status={s.fitScore >= 80 ? 'success' : s.fitScore >= 60 ? 'normal' : 'exception'} />
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>风险度 </span>
                  <Progress percent={s.riskScore} size="small" style={{ width: 80, marginBottom: 0 }} status={s.riskScore <= 30 ? 'success' : s.riskScore <= 60 ? 'normal' : 'exception'} />
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                {s.suggestions.map((ss, si) => <li key={si}>{ss}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'tasks',
      label: <span><RocketOutlined /> 培养任务</span>,
      children: (
        <div>
          {Object.entries(data.nextWeekTasks).map(([position, tasks]) => (
            <Card key={position} variant="borderless" style={{ marginBottom: 12 }} styles={{ body: { padding: 16 } }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{position}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map((task, ti) => (
                  <div key={ti} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color="green" style={{ flexShrink: 0 }}>任务{ti + 1}</Tag>
                    <span style={{ fontSize: 13 }}>{task}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <FlowStage current="suggest" />
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BulbOutlined style={{ color: 'var(--ai)' }} />
          HR 今日行动台
        </h2>
        <Tooltip title={aiStatusTip}>
          <Tag color={aiStatusColor} style={{ fontSize: 11 }}>
            {aiStatusLabel}
          </Tag>
        </Tooltip>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={() => fetchSuggestions(true)} size="small" loading={loading}>刷新</Button>
      </div>
      <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>
        AI 根据风险预警、周报、导师反馈和任务完成情况，生成今日处理优先级与可执行材料
      </p>

      {/* 顶部指标卡 */}
      <div
        className="suggestion-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--risk-high)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>今日必须处理</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-high)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {highPriority.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>高优先级对象</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--risk-high-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThunderboltOutlined style={{ fontSize: 20, color: 'var(--risk-high)' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--risk-mid)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>建议本周跟进</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--risk-mid)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {mediumPriority.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>中优先级对象</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--risk-mid-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarOutlined style={{ fontSize: 20, color: 'var(--risk-mid)' }} />
            </div>
          </div>
        </Card>
        <Card variant="borderless" style={{ borderLeft: '3px solid var(--ai)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>已生成材料</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ai)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {materialCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>话术 / 提纲 / 任务</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--ai-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileTextOutlined style={{ fontSize: 20, color: 'var(--ai)' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* 主内容区：左右布局 */}
      <div className="suggestion-main-layout" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 左侧：优先级队列 */}
        <div style={{ minWidth: 0 }}>
          <Card
            className="suggestion-priority-panel"
            variant="borderless"
            title={<span style={{ fontWeight: 600, fontSize: 15, color: 'var(--canvas)' }}>优先级队列</span>}
            styles={{ body: { padding: '8px 12px' } }}
          >
            {/* 高优先级 */}
            {highPriority.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', fontSize: 12, color: 'var(--risk-high)', fontWeight: 600 }}>
                  <ThunderboltOutlined />
                  <span>高优先级 · 今日必须处理</span>
                  <Tag color="red" style={{ fontSize: 11, marginLeft: 'auto' }}>{highPriority.length}</Tag>
                </div>
                {highPriority.map(action => {
                  const growth = data.growthSuggestions.find(g => g.internId === action.internId);
                  const isSelected = selectedIntern?.internId === action.internId;
                  return (
                    <div
                      className={`suggestion-queue-card ${isSelected ? 'is-selected high' : 'high'}`}
                      key={action.internId}
                      onClick={() => setSelectedId(action.internId)}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 4,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(250,249,245,0.96)' : 'rgba(250,249,245,0.84)',
                        border: isSelected ? '1px solid var(--risk-high-border)' : '1px solid transparent',
                        borderLeft: '3px solid var(--risk-high)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{action.internName}</span>
                        <Tag color="volcano" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{getPositionLabel(action.position)}</Tag>
                        {followedIds.has(action.internId) && (
                          <CheckCircleOutlined style={{ color: 'var(--risk-low)', fontSize: 12, marginLeft: 'auto' }} />
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        导师：{action.mentor}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {action.reason || '需要关注'}
                      </div>
                      {growth && (
                        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                          <span style={{ color: 'var(--muted)' }}>
                            适岗度 <strong style={{ color: growth.fitScore >= 80 ? 'var(--risk-low)' : growth.fitScore >= 60 ? 'var(--risk-mid)' : 'var(--risk-high)' }}>{growth.fitScore}</strong>
                          </span>
                          <span style={{ color: 'var(--muted)' }}>
                            风险度 <strong style={{ color: growth.riskScore <= 30 ? 'var(--risk-low)' : growth.riskScore <= 60 ? 'var(--risk-mid)' : 'var(--risk-high)' }}>{growth.riskScore}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 中优先级 */}
            {mediumPriority.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', fontSize: 12, color: 'var(--risk-mid)', fontWeight: 600 }}>
                  <CalendarOutlined />
                  <span>中优先级 · 建议本周跟进</span>
                  <Tag color="orange" style={{ fontSize: 11, marginLeft: 'auto' }}>{mediumPriority.length}</Tag>
                </div>
                {mediumPriority.map(action => {
                  const growth = data.growthSuggestions.find(g => g.internId === action.internId);
                  const isSelected = selectedIntern?.internId === action.internId;
                  return (
                    <div
                      className={`suggestion-queue-card ${isSelected ? 'is-selected medium' : 'medium'}`}
                      key={action.internId}
                      onClick={() => setSelectedId(action.internId)}
                      style={{
                        padding: '10px 12px',
                        marginBottom: 4,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(250,249,245,0.96)' : 'rgba(250,249,245,0.84)',
                        border: isSelected ? '1px solid var(--risk-mid-border)' : '1px solid transparent',
                        borderLeft: '3px solid var(--risk-mid)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{action.internName}</span>
                        <Tag color="volcano" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{getPositionLabel(action.position)}</Tag>
                        {followedIds.has(action.internId) && (
                          <CheckCircleOutlined style={{ color: 'var(--risk-low)', fontSize: 12, marginLeft: 'auto' }} />
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                        导师：{action.mentor}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {action.reason || '需要关注'}
                      </div>
                      {growth && (
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, marginTop: 6 }}>
                          <span style={{ color: 'var(--muted)' }}>
                            适岗度 <strong style={{ color: growth.fitScore >= 80 ? 'var(--risk-low)' : growth.fitScore >= 60 ? 'var(--risk-mid)' : 'var(--risk-high)' }}>{growth.fitScore}</strong>
                          </span>
                          <span style={{ color: 'var(--muted)' }}>
                            风险度 <strong style={{ color: growth.riskScore <= 30 ? 'var(--risk-low)' : growth.riskScore <= 60 ? 'var(--risk-mid)' : 'var(--risk-high)' }}>{growth.riskScore}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {data.hrActions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13 }}>
                <CheckCircleOutlined style={{ fontSize: 28, color: 'var(--risk-low)', marginBottom: 8, display: 'block' }} />
                暂无需要处理的高风险对象
              </div>
            )}
          </Card>
        </div>

        {/* 右侧：选中对象详情 */}
        <div style={{ minWidth: 0 }}>
          {selectedIntern ? (
            <Card
              className="suggestion-detail-card"
              variant="borderless"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedIntern.internName}</span>
                  <Tag color="volcano">{getPositionLabel(selectedIntern.position)}</Tag>
                  <Tag color={selectedIntern.priority === 'high' ? 'red' : 'orange'}>
                    {selectedIntern.priority === 'high' ? '高优先级' : '中优先级'}
                  </Tag>
                </div>
              }
              extra={
                <Link href={`/interns/${selectedIntern.internId}`}>
                  <Button type="link" size="small">查看完整档案 →</Button>
                </Link>
              }
            >
              {/* 为什么现在处理 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                  为什么现在处理
                </div>
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--risk-high-bg)',
                  borderRadius: 8,
                  borderLeft: '3px solid var(--risk-high)',
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: 'var(--ink)',
                }}>
                  {selectedIntern.reason || '综合风险指标需关注'}
                </div>
              </div>

              {/* HR 沟通目标 */}
              {selectedIntern.goal && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                    HR 沟通目标
                  </div>
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--ai-soft)',
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: 'var(--ink)',
                  }}>
                    {selectedIntern.goal}
                  </div>
                </div>
              )}

              {/* 推荐动作 */}
              {selectedIntern.method && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                    推荐动作
                  </div>
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--surface-soft)',
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}>
                    {selectedIntern.method}
                  </div>
                </div>
              )}

              {/* 可复制话术 */}
              {selectedIntern.suggestion && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                    HR 沟通话术
                  </div>
                  <div style={{
                    padding: '12px 14px',
                    background: 'var(--surface-soft)',
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.7,
                    position: 'relative',
                  }}>
                    {selectedIntern.suggestion}
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(selectedIntern.suggestion, '话术')}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  </div>
                </div>
              )}

              {/* 关联材料 */}
              <div className="suggestion-material-grid">
                <div className="suggestion-material-card dark">
                  <div className="material-kicker"><TeamOutlined /> 导师 1v1 提纲</div>
                  <div className="material-title">{selectedMentorTemplate?.title || '本周沟通提纲'}</div>
                  <div className="material-list">
                    {(selectedMentorTemplate?.questions || []).slice(0, 3).map((q, i) => (
                      <span key={i}>Q{i + 1}. {q}</span>
                    ))}
                  </div>
                </div>
                <div className="suggestion-material-card">
                  <div className="material-kicker"><BulbOutlined /> 成长建议</div>
                  <div className="material-list">
                    {(selectedIntern.growthSuggestions.length > 0 ? selectedIntern.growthSuggestions : ['保持当前跟进节奏，观察下周任务质量变化']).slice(0, 4).map((item, i) => (
                      <span key={i}>{item}</span>
                    ))}
                  </div>
                </div>
                <div className="suggestion-material-card accent">
                  <div className="material-kicker"><RocketOutlined /> 下周培养任务</div>
                  <div className="material-list">
                    {(selectedTaskList.length > 0 ? selectedTaskList : ['安排一次导师复盘', '明确一个可验收产出']).slice(0, 4).map((task, i) => (
                      <span key={i}>{task}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    if (selectedIntern.suggestion) {
                      handleCopy(selectedIntern.suggestion, 'HR 话术');
                    } else {
                      message.info('暂无可复制话术');
                    }
                  }}
                >
                  复制 HR 话术
                </Button>
                <Link href={`/interventions/${selectedIntern.internId}`}>
                  <Button icon={<FileTextOutlined />}>
                    生成导师 1v1 提纲
                  </Button>
                </Link>
                <Button
                  icon={<CalendarOutlined />}
                  onClick={() => handleFollow(selectedIntern.internId, selectedIntern.internName)}
                  disabled={followedIds.has(selectedIntern.internId)}
                >
                  {followedIds.has(selectedIntern.internId) ? '已标记跟进' : '标记本周跟进'}
                </Button>
              </div>
            </Card>
          ) : (
            <Card variant="borderless">
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
                <UserOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                从左侧选择一个实习生查看 AI 建议
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 材料库 */}
      <div style={{ marginTop: 24 }}>
        <Card variant="borderless">
          <Tabs items={tabItems} size="small" />
        </Card>
      </div>
    </div>
  );
}
