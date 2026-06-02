'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Table, Tag, Progress, Input, Select, Space, Button, Avatar, Tooltip, App, Grid } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
const { useBreakpoint } = Grid;

import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/fetch-json';
import { FlowStage } from '@/components/flow-stage';

interface Intern {
  id: string;
  name: string;
  gender: string;
  school: string;
  major: string;
  entryDate: string;
  phase: string;
  position: string;
  mentor: string;
  fitScore: number;
  riskScore: number;
  potentialScore: number;
  tags: string[];
  riskLevel: string;
  potentialType: string;
  taskCompletionRate: number;
  latestReport: string;
  latestFeedback: string;
  hasActiveAlert: boolean;
}

const FALLBACK_INTERNS: Intern[] = [
  { id: 'demo-001', name: '张晨', gender: '男', school: '浙江大学', major: '计算机科学', entryDate: '2026-03-01', phase: '产出期', position: '研发实习生', mentor: '王建国', fitScore: 52, riskScore: 78, potentialScore: 65, tags: ['任务延期', '代码质量高', '有点迷茫'], riskLevel: '高', potentialType: '', taskCompletionRate: 45, latestReport: '本周完成2个模块开发，但在联调阶段遇到困难', latestFeedback: '技术能力不错但需要更主动沟通', hasActiveAlert: true },
  { id: 'demo-002', name: '李安然', gender: '女', school: '北京大学', major: '产品设计', entryDate: '2026-02-15', phase: '产出期', position: '产品实习生', mentor: '陈思远', fitScore: 88, riskScore: 15, potentialScore: 92, tags: ['学习速度快', '主动性强', '产品sense强'], riskLevel: '低', potentialType: '快速成长型', taskCompletionRate: 95, latestReport: '完成竞品分析报告，提出3个创新功能点', latestFeedback: '超出预期，建议加入重点培养池', hasActiveAlert: false },
  { id: 'demo-003', name: '王浩然', gender: '男', school: '上海交通大学', major: '软件工程', entryDate: '2026-03-10', phase: '适应期', position: '研发实习生', mentor: '王建国', fitScore: 71, riskScore: 35, potentialScore: 78, tags: ['学习速度快', '代码质量高'], riskLevel: '低', potentialType: '高质量交付型', taskCompletionRate: 82, latestReport: '独立完成用户模块重构', latestFeedback: '代码质量稳定，可以承担更多责任', hasActiveAlert: false },
  { id: 'demo-004', name: '赵雨萱', gender: '女', school: '复旦大学', major: '数据科学', entryDate: '2026-01-20', phase: '产出期', position: '产品实习生', mentor: '陈思远', fitScore: 63, riskScore: 58, potentialScore: 70, tags: ['反馈偏少', '进度慢'], riskLevel: '中', potentialType: '', taskCompletionRate: 55, latestReport: '完成数据看板需求文档', latestFeedback: '需要更主动汇报进度', hasActiveAlert: true },
  { id: 'demo-005', name: '刘子轩', gender: '男', school: '中山大学', major: '市场营销', entryDate: '2026-04-01', phase: '入门期', position: '销售实习生', mentor: '林晓峰', fitScore: 45, riskScore: 72, potentialScore: 55, tags: ['情绪波动', '有点迷茫', '进度慢'], riskLevel: '高', potentialType: '', taskCompletionRate: 38, latestReport: '本周跟随导师拜访3家客户', latestFeedback: '对业务理解还需加强，建议安排更多实战机会', hasActiveAlert: true },
  { id: 'demo-006', name: '陈思琪', gender: '女', school: '武汉大学', major: '人工智能', entryDate: '2026-02-01', phase: '产出期', position: '研发实习生', mentor: '王建国', fitScore: 85, riskScore: 20, potentialScore: 90, tags: ['主动性强', '代码质量高', '转正潜力高'], riskLevel: '低', potentialType: '综合优秀型', taskCompletionRate: 92, latestReport: '完成推荐算法原型，准确率提升12%', latestFeedback: '表现优秀，建议提前启动转正评估', hasActiveAlert: false },
];

const avatarPalette = [
  ['#f0c6b3', '#cc785c', '#3b2f2a'],
  ['#d8e8de', '#5db872', '#2d4634'],
  ['#f1dfb6', '#d4a017', '#49391a'],
  ['#d9eee9', '#5db8a6', '#1f4942'],
  ['#ead8cb', '#a9583e', '#3a2b25'],
];

function getPositionLabel(position: string) {
  return position.replace('实习生', '');
}

function getAvatarSrc(name: string) {
  const code = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [skin, accent, ink] = avatarPalette[code % avatarPalette.length];
  const hair = code % 3 === 0
    ? '<path d="M24 19c5-10 23-10 28 0-5-4-10-5-14-5s-9 1-14 5z" />'
    : '<path d="M20 26c2-12 9-18 18-18s16 6 18 18c-8-6-29-6-36 0z" />';
  const mouth = code % 2 === 0
    ? '<path d="M30 43c4 4 12 4 16 0" />'
    : '<path d="M32 43c3 2 9 2 12 0" />';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="#faf9f5"/>
      <circle cx="32" cy="35" r="20" fill="${skin}"/>
      <g fill="${ink}">${hair}</g>
      <circle cx="25" cy="35" r="2.4" fill="${ink}"/>
      <circle cx="39" cy="35" r="2.4" fill="${ink}"/>
      <path d="M32 35c-1 3-2 5 1 6" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="${mouth.match(/d="([^"]+)"/)?.[1] || 'M32 43c3 2 9 2 12 0'}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="18" cy="48" r="6" fill="${accent}" opacity=".85"/>
      <circle cx="48" cy="18" r="5" fill="${accent}" opacity=".65"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function InternsPage() {
  return <InternsContent />;
}

function InternsContent() {
  const { message } = App.useApp();
  const router = useRouter();
  const [interns, setInterns] = useState<Intern[]>(FALLBACK_INTERNS);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchInterns = useCallback((skipCache?: boolean) => {
    setLoading(true);
    fetchJson<Intern[]>('/api/interns', {
      fallback: FALLBACK_INTERNS,
      validate: (d): d is Intern[] => Array.isArray(d),
      timeoutMs: 6000,
      skipCache,
    }).then(({ data }) => {
      setInterns(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInterns();
  }, [fetchInterns]);

  // 过滤实习生
  const filteredInterns = useMemo(() => interns.filter(intern => {
    const matchesSearch = intern.name.includes(searchText) ||
                         intern.school.includes(searchText) ||
                         intern.major.includes(searchText);
    const matchesPosition = positionFilter === 'all' || getPositionLabel(intern.position) === positionFilter;
    const matchesRisk = riskFilter === 'all' || intern.riskLevel === riskFilter;
    return matchesSearch && matchesPosition && matchesRisk;
  }), [interns, searchText, positionFilter, riskFilter]);

  // 获取唯一岗位列表
  const positions = useMemo(() => [...new Set(interns.map(i => getPositionLabel(i.position)))], [interns]);

  // 计算入职天数
  const getDaysSinceEntry = (entryDate: string) => {
    const entry = new Date(entryDate);
    const now = new Date();
    return Math.floor((now.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  };

  // 表格列定义
  const columns = useMemo(() => [
    {
      title: '实习生',
      dataIndex: 'name',
      key: 'name',
      width: 230,
      render: (name: string, record: Intern) => (
        <Space size={12}>
          <Avatar
            size={42}
            src={getAvatarSrc(name)}
            style={{ border: '1px solid var(--hairline)', background: 'var(--surface-soft)' }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              <Link href={`/interns/${record.id}`} style={{ color: 'var(--ai)' }}>
                {name}
              </Link>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{record.school}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '岗位',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      render: (position: string) => (
        <Tag color="volcano">{getPositionLabel(position)}</Tag>
      ),
    },
    {
      title: '入职天数',
      dataIndex: 'entryDate',
      key: 'entryDate',
      responsive: ['md'] as const,
      width: 100,
      render: (date: string) => (
        <span>{getDaysSinceEntry(date)}天</span>
      ),
    },
    {
      title: '阶段',
      dataIndex: 'phase',
      key: 'phase',
      responsive: ['md'] as const,
      width: 100,
      render: (phase: string) => {
        const colorMap: Record<string, string> = {
          '入门期': 'orange',
          '适应期': 'blue',
          '产出期': 'green',
          '转正评估期': 'volcano',
        };
        return <Tag color={colorMap[phase] || 'default'}>{phase}</Tag>;
      },
    },
    {
      title: '适岗度',
      dataIndex: 'fitScore',
      key: 'fitScore',
      width: 120,
      sorter: (a: Intern, b: Intern) => a.fitScore - b.fitScore,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : 'exception'}
          format={percent => `${percent}`}
        />
      ),
    },
    {
      title: '风险度',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 120,
      sorter: (a: Intern, b: Intern) => a.riskScore - b.riskScore,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          status={score <= 30 ? 'success' : score <= 60 ? 'normal' : 'exception'}
          format={percent => `${percent}`}
        />
      ),
    },
    {
      title: '高潜度',
      dataIndex: 'potentialScore',
      key: 'potentialScore',
      responsive: ['md'] as const,
      width: 120,
      sorter: (a: Intern, b: Intern) => a.potentialScore - b.potentialScore,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : 'exception'}
          format={percent => `${percent}`}
        />
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (level: string) => {
        const colorMap: Record<string, string> = {
          '高': 'red',
          '中': 'orange',
          '低': 'green',
        };
        return <Tag color={colorMap[level]}>{level}风险</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      responsive: ['lg'] as const,
      width: 200,
      render: (tags: string[]) => (
        <Space wrap size={4}>
          {tags.slice(0, 3).map((tag, index) => {
            const isPositive = ['学习速度快', '主动性强', '代码质量高', '转正潜力高', '产品sense强'].includes(tag);
            const isNegative = ['任务延期', '情绪波动', '反馈偏少', '进度慢', '有点迷茫'].includes(tag);
            return (
              <Tag
                key={index}
                color={isPositive ? 'green' : isNegative ? 'red' : 'default'}
                style={{ fontSize: 12 }}
              >
                {tag}
              </Tag>
            );
          })}
          {tags.length > 3 && (
            <Tooltip title={tags.slice(3).join('、')}>
              <Tag style={{ fontSize: 12 }}>+{tags.length - 3}</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '任务完成率',
      dataIndex: 'taskCompletionRate',
      key: 'taskCompletionRate',
      responsive: ['lg'] as const,
      width: 120,
      sorter: (a: Intern, b: Intern) => a.taskCompletionRate - b.taskCompletionRate,
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 80 ? 'success' : rate >= 60 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: unknown, record: Intern) => (
        <Space>
          {record.hasActiveAlert && (
            <Tooltip title="有活跃预警">
              <Tag color="red">预警</Tag>
            </Tooltip>
          )}
          {record.potentialType && (
            <Tooltip title={record.potentialType}>
              <Tag color="blue">高潜</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], []) as any[];

  return (
    <div>
      <FlowStage current="track" />
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>实习生列表</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
          共 {filteredInterns.length} 名实习生
        </p>
      </div>

      {/* 筛选栏 */}
      <Card variant="borderless" style={{ marginBottom: 16 }} className="intern-filter-card">
        <Space wrap>
          <Input
            placeholder="搜索姓名、学校、专业"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="选择岗位"
            value={positionFilter}
            onChange={setPositionFilter}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: '全部岗位' },
              ...positions.map(p => ({ value: p, label: p })),
            ]}
          />
          <Select
            placeholder="风险等级"
            value={riskFilter}
            onChange={setRiskFilter}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: '全部等级' },
              { value: '高', label: '高风险' },
              { value: '中', label: '中风险' },
              { value: '低', label: '低风险' },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchInterns(true)}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            disabled={selectedRowKeys.length < 2}
            onClick={() => {
              if (selectedRowKeys.length > 4) {
                message.warning('最多对比 4 名实习生');
                return;
              }
              router.push(`/compare?ids=${selectedRowKeys.join(',')}`);
            }}
          >
            对比 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length})` : ''}
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button type="link" onClick={() => setSelectedRowKeys([])}>清空选择</Button>
          )}
        </Space>
      </Card>

      {/* 实习生表格 */}
      <Card variant="borderless" className="intern-roster-card">
        <Table
          dataSource={filteredInterns}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: isMobile ? 800 : 1500 }}
          size="middle"
          rowClassName="intern-roster-row"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => {
              if (keys.length > 4) {
                message.warning('最多对比 4 名实习生');
                return;
              }
              setSelectedRowKeys(keys);
            },
            getCheckboxProps: (record) => ({
              disabled: selectedRowKeys.length >= 4 && !selectedRowKeys.includes(record.id),
            }),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 名实习生`,
          }}
        />
      </Card>
    </div>
  );
}
