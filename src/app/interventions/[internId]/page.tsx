'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  App,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Button,
  Typography,
  Alert,
  Steps,
  Divider,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  WarningOutlined,
  FileTextOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  SolutionOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { fetchJson } from '@/lib/fetch-json';
import { FlowStage } from '@/components/flow-stage';

const { Title, Text } = Typography;

interface InterventionData {
  aiStatus?: 'live' | 'cached-live' | 'cached-fallback' | 'fallback';
  intern: {
    id: string;
    name: string;
    position: string;
    mentor: string;
    riskLevel: string;
    riskScore: number;
    fitScore: number;
    potentialScore: number;
    tags: string[];
  };
  riskSummary: {
    level: string;
    score: number;
    headline: string;
    reasons: string[];
  };
  evidence: Array<{
    source: string;
    content: string;
    signal: string;
  }>;
  hrScript: {
    opener: string;
    followUp: string;
    closing: string;
    fullScript: string;
    tips: string[];
  };
  mentorOutline: {
    title: string;
    duration: string;
    atmosphere: string;
    questions: Array<{ q: string; purpose: string }>;
    closingAdvice: string;
  };
  nextWeekTasks: {
    principle: string;
    tasks: Array<{
      title: string;
      description: string;
      deliverable: string;
      acceptance: string;
    }>;
  };
}

const FALLBACK_INTERVENTION: InterventionData = {
  aiStatus: 'fallback',
  intern: { id: 'demo-001', name: '张晨', position: '研发实习生', mentor: '王建国', riskLevel: '高', riskScore: 78, fitScore: 52, potentialScore: 65, tags: ['任务延期', '代码质量高', '有点迷茫'] },
  riskSummary: { level: '高', score: 78, headline: '连续两周任务延期，周报出现消极情绪', reasons: ['核心模块联调失败率高', '周报中出现"有点迷茫"表达', '任务完成率从65%降至45%'] },
  evidence: [
    { source: '周报 (5/19)', content: '本周完成2个模块开发，但在联调阶段遇到困难', signal: '技术卡点' },
    { source: '导师反馈 (5/19)', content: '技术能力不错但需要更主动沟通', signal: '沟通不足' },
    { source: '任务记录', content: '近两周5个任务中2个延期交付', signal: '产出下降' },
    { source: '趋势数据', content: '适岗度从60降至52，风险度从55升至78', signal: '趋势恶化' },
  ],
  hrScript: {
    opener: '张晨你好，最近适应得怎么样？我注意到你这周周报里提到了联调遇到困难，想和你聊聊看有没有什么我能帮到的。',
    followUp: '你觉得目前卡住的地方主要是技术层面的，还是沟通协调上的？有没有什么具体的场景让你觉得比较吃力？',
    closing: '好的，我了解了。接下来我们会调整一下任务节奏，也会让王建国多给你一些反馈。你不用有太大压力，遇到问题随时可以找我聊。',
    fullScript: '开场：张晨你好，最近适应得怎么样？我注意到你这周周报里提到了联调遇到困难，想和你聊聊看有没有什么我能帮到的。\n\n跟进：你觉得目前卡住的地方主要是技术层面的，还是沟通协调上的？有没有什么具体的场景让你觉得比较吃力？\n\n收尾：好的，我了解了。接下来我们会调整一下任务节奏，也会让王建国多给你一些反馈。你不用有太大压力，遇到问题随时可以找我聊。',
    tips: ['不要用"考核"的语气，重点是了解困难', '如果学生提到具体技术问题，记录后反馈给导师', '沟通后标记跟进状态，下周复查'],
  },
  mentorOutline: {
    title: '张晨 1v1 沟通提纲',
    duration: '30分钟',
    atmosphere: '轻松、支持性',
    questions: [
      { q: '最近联调遇到的困难，能具体说说是哪些接口或流程吗？', purpose: '定位技术卡点' },
      { q: '你觉得是文档不够清楚，还是缺少和对方的沟通？', purpose: '区分技术vs沟通问题' },
      { q: '如果把任务拆小一点，你觉得每周能稳定交付几个小模块？', purpose: '找到可接受的节奏' },
      { q: '团队里有没有谁的技术风格是你想学习的？', purpose: '发现榜样和buddy人选' },
    ],
    closingAdvice: '结束时明确下周一个小目标（比如独立完成1个接口联调），并在周中主动check一次进度。',
  },
  nextWeekTasks: {
    principle: '降低复杂度、建立小胜利、恢复信心',
    tasks: [
      { title: '独立完成1个低风险接口联调', description: '选择文档最清晰、依赖最少的接口', deliverable: '联调通过截图', acceptance: '接口返回正确数据，无报错' },
      { title: '输出模块学习笔记', description: '记录联调过程中学到的知识点', deliverable: 'Markdown笔记', acceptance: '至少包含3个关键知识点' },
      { title: '参与一次代码Review', description: 'Review同事的代码并提出至少1个建议', deliverable: 'Review评论截图', acceptance: '评论有建设性' },
    ],
  },
};

export default function InterventionPage() {
  const { message } = App.useApp();
  const params = useParams();
  const [data, setData] = useState<InterventionData>(FALLBACK_INTERVENTION);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [workflowTs] = useState(() => {
    const now = Date.now();
    const fmt = (ms: number) => new Date(now - ms).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return [fmt(5000), fmt(4000), fmt(3000), fmt(2000), fmt(1000)];
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleSteps(prev => {
        if (prev >= 5) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (params.internId) {
      fetchJson<InterventionData>(`/api/interventions/${params.internId}`, {
        fallback: FALLBACK_INTERVENTION,
        validate: (d): d is InterventionData => !!d && typeof d === 'object' && 'intern' in d,
        timeoutMs: 8000,
      }).then(({ data }) => {
        setData(data);
      });
    }
  }, [params.internId]);

  const copyScript = () => {
    navigator.clipboard.writeText(data.hrScript.fullScript);
    message.success('HR 话术已复制到剪贴板');
  };

  const markFollowUp = () => {
    message.success(`已标记 ${data.intern.name} 为本周跟进对象`);
  };

  const genMentorTodo = () => {
    const outline = data.mentorOutline;
    const todoText = `${outline.title}\n时长：${outline.duration}\n场景：${outline.atmosphere}\n\n问题：\n${outline.questions.map((q, i) => `${i + 1}. ${q.q}\n   目的：${q.purpose}`).join('\n')}\n\n结束建议：${outline.closingAdvice}`;
    navigator.clipboard.writeText(todoText);
    message.success('导师 1v1 提纲已复制，可粘贴至待办系统');
  };

  const riskColor = data.intern.riskLevel === '高' ? '#d94b4b' : data.intern.riskLevel === '中' ? '#d99a2b' : '#3b9f6b';

  return (
    <div>
      <FlowStage current="intervene" />
      {/* 一行决策摘要 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        background: riskColor + '0a',
        border: `1px solid ${riskColor}22`,
        borderRadius: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <Tag color={data.intern.riskLevel === '高' ? 'red' : data.intern.riskLevel === '中' ? 'orange' : 'green'} style={{ margin: 0 }}>
          {data.intern.riskLevel}风险 {data.intern.riskScore}分
        </Tag>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 200 }}>
          {data.riskSummary.headline}
        </span>
        <Space size={6} wrap>
          {data.riskSummary.reasons.slice(0, 2).map((r, i) => (
            <Tag key={i} style={{ fontSize: 11 }}>{r}</Tag>
          ))}
        </Space>
      </div>

      {/* 顶部导航 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Link href="/alerts">
            <Button icon={<ArrowLeftOutlined />}>返回预警</Button>
          </Link>
          <Link href={`/interns/${data.intern.id}`}>
            <Button type="link">查看完整画像</Button>
          </Link>
        </Space>
      </div>

      {/* 方案头部 */}
      <Card
        variant="borderless"
        data-demo="intervention-header"
        style={{
          marginBottom: 20,
          background: `linear-gradient(135deg, ${riskColor}11 0%, ${riskColor}05 100%)`,
          borderLeft: `4px solid ${riskColor}`,
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {data.intern.name}
                  <Tag color={data.intern.riskLevel === '高' ? 'red' : data.intern.riskLevel === '中' ? 'orange' : 'green'} style={{ marginLeft: 12 }}>
                    {data.intern.riskLevel}风险
                  </Tag>
                  <Tooltip title={
                    data.aiStatus === 'live' ? 'MiMo LLM 本次实时返回，内容为 AI 原创生成' :
                    data.aiStatus === 'cached-live' ? '已命中最近一次 MiMo 生成结果，保证秒开' :
                    data.aiStatus === 'cached-fallback' ? '模型响应超时，已启用经验证的稳定方案并缓存，确保 HR 工作流不中断' :
                    '模型暂不可用，启用基于规则的标准化方案'
                  }>
                    <Tag color={data.aiStatus === 'live' ? 'volcano' : data.aiStatus === 'cached-live' ? 'blue' : data.aiStatus === 'cached-fallback' ? 'orange' : 'default'} style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>
                      {data.aiStatus === 'live' ? 'MiMo LLM 生成' : data.aiStatus === 'cached-live' ? 'MiMo LLM 生成' : data.aiStatus === 'cached-fallback' ? '稳定方案缓存' : '规则兜底'}
                    </Tag>
                  </Tooltip>
                </Title>
                <Text type="secondary">
                  {data.intern.position} · 导师：{data.intern.mentor}
                </Text>
              </div>
              <div>
                {data.intern.tags.map((tag, i) => (
                  <Tag key={i} color={['任务延期', '情绪波动', '反馈偏少', '进度慢', '有点迷茫'].includes(tag) ? 'red' : 'default'}>
                    {tag}
                  </Tag>
                ))}
              </div>
            </Space>
          </Col>
          <Col>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: riskColor }}>{data.intern.riskScore}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>风险度评分</div>

              {/* AI 工作流时间线 */}
              <div style={{ textAlign: 'left', minWidth: 220 }} data-demo="workflow-timeline">
                {[
                  { icon: <FileTextOutlined />, label: '读取周报与导师反馈' },
                  { icon: <WarningOutlined />, label: '识别风险信号' },
                  { icon: <SolutionOutlined />, label: '生成 HR 沟通话术' },
                  { icon: <TeamOutlined />, label: '生成导师 1v1 提纲' },
                  { icon: <CalendarOutlined />, label: '生成下周培养任务' },
                ].map((step, i) => (
                  <div key={i} className="wf-step" style={{ opacity: i < visibleSteps ? 1 : 0.25 }}>
                    <span className="wf-icon">{i < visibleSteps ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : step.icon}</span>
                    <span className="wf-label">{step.label}</span>
                    <span className="wf-time">{workflowTs[i]}</span>
                  </div>
                ))}
              </div>

              {/* HR 一键行动区 */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <Button type="primary" size="small" icon={<CopyOutlined />} onClick={copyScript} data-demo="copy-script">
                  复制 HR 话术
                </Button>
                <Button size="small" icon={<ScheduleOutlined />} onClick={genMentorTodo}>
                  生成导师待办
                </Button>
                <Button size="small" icon={<CalendarOutlined />} onClick={markFollowUp} data-demo="mark-followup">
                  标记本周跟进
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 流程步骤 */}
      <Card variant="borderless" style={{ marginBottom: 20 }}>
        <Steps
          current={-1}
          items={[
            { title: '发现问题', icon: <WarningOutlined /> },
            { title: 'AI 分析', icon: <ThunderboltOutlined /> },
            { title: '生成方案', icon: <SolutionOutlined />, status: 'process' },
            { title: 'HR 介入', icon: <FileTextOutlined /> },
            { title: '跟踪效果', icon: <CalendarOutlined /> },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]}>
        {/* 左列：风险摘要 + 证据 */}
        <Col xs={24} lg={14}>
          {/* 风险摘要 */}
          <Card
            title={<Space><WarningOutlined style={{ color: 'var(--risk-high)' }} />风险摘要</Space>}
            variant="borderless"
            style={{ marginBottom: 16 }}
          >
            <Alert
              title={data.riskSummary.headline}
              type={data.riskSummary.level === '高' ? 'error' : data.riskSummary.level === '中' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div>
              <Text strong>触发原因：</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
                {data.riskSummary.reasons.map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                ))}
              </ul>
            </div>
          </Card>

          {/* AI 证据链 */}
          <Card
            title={
              <Space>
                <ThunderboltOutlined style={{ color: 'var(--ai)' }} />
                <span>AI 证据链</span>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
                  {data.evidence.filter(e => e.source.includes('周报')).length} 篇周报 ·
                  {data.evidence.filter(e => e.source.includes('导师')).length} 条反馈 ·
                  {data.evidence.filter(e => e.source.includes('任务')).length} 条任务
                </Text>
              </Space>
            }
            variant="borderless"
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.evidence.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'var(--surface-soft)',
                    borderRadius: 6,
                    borderLeft: '3px solid var(--ai)',
                  }}
                >
                  <Tag color="volcano" style={{ fontSize: 10, flexShrink: 0, margin: '2px 0 0' }}>{item.signal}</Tag>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, color: 'var(--ink)' }}>&ldquo;{item.content}&rdquo;</Text>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 右列：HR话术 + 导师提纲 + 下周任务 */}
        <Col xs={24} lg={10}>
          {/* HR 话术 */}
          <Card
            title={<Space><FileTextOutlined style={{ color: 'var(--color-fit)' }} />HR 沟通话术</Space>}
            variant="borderless"
            style={{ marginBottom: 16 }}
            extra={
              <Button icon={<CopyOutlined />} size="small" onClick={copyScript}>
                复制话术
              </Button>
            }
          >
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>开场：</Text>
              <div style={{ padding: '8px 12px', background: 'var(--ai-soft)', borderRadius: 6, marginTop: 4 }}>
                {data.hrScript.opener}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>跟进提问：</Text>
              <div style={{ padding: '8px 12px', background: 'var(--ai-soft)', borderRadius: 6, marginTop: 4 }}>
                {data.hrScript.followUp}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>收尾：</Text>
              <div style={{ padding: '8px 12px', background: 'var(--ai-soft)', borderRadius: 6, marginTop: 4 }}>
                {data.hrScript.closing}
              </div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>沟通要点：</Text>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 13 }}>
                {data.hrScript.tips.map((tip, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{tip}</li>
                ))}
              </ul>
            </div>
          </Card>

          {/* 导师 1v1 提纲 */}
          <Card
            title={<Space><SolutionOutlined style={{ color: 'var(--risk-low)' }} />导师 1v1 提纲</Space>}
            variant="borderless"
            style={{ marginBottom: 16 }}
          >
            <div style={{ marginBottom: 12 }}>
              <Space>
                <Tag color="blue">时长 {data.mentorOutline.duration}</Tag>
                <Tag color="default">{data.mentorOutline.atmosphere}</Tag>
              </Space>
            </div>
            {data.mentorOutline.questions.map((item, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  <Tag color="blue" style={{ marginRight: 8 }}>Q{i + 1}</Tag>
                  {item.q}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 36 }}>
                  目的：{item.purpose}
                </div>
              </div>
            ))}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>
              <CheckCircleOutlined style={{ color: 'var(--risk-low)', marginRight: 4 }} />
              {data.mentorOutline.closingAdvice}
            </div>
          </Card>

          {/* 下周任务 */}
          <Card
            title={<Space><CalendarOutlined style={{ color: 'var(--risk-mid)' }} />下周培养任务</Space>}
            variant="borderless"
          >
            <Alert
              title={data.nextWeekTasks.principle}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {data.nextWeekTasks.tasks.map((task, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  background: 'var(--risk-mid-bg)',
                  borderRadius: 8,
                  marginBottom: 8,
                  border: '1px solid var(--risk-mid-border)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  任务{i + 1}：{task.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
                  {task.description}
                </div>
                <Space separator={<span style={{ color: 'var(--hairline)' }}>|</span>}>
                  <Text type="secondary" style={{ fontSize: 12 }}>产出：{task.deliverable}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>验收：{task.acceptance}</Text>
                </Space>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
