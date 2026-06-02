'use client';

import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Progress,
  Button,
  Typography,
  Space,
  Timeline,
  List,
  Avatar,
  Rate,
  Divider,
  Alert,
} from 'antd';
import {
  UserOutlined,
  TrophyOutlined,
  BookOutlined,
  CalendarOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  HeartOutlined,
  TeamOutlined,
  RocketOutlined,
  StarOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

// 模拟实习生个人数据
const INTERN_DATA = {
  name: '张晨',
  avatar: '👨‍💻',
  position: '研发实习生',
  department: '技术平台部',
  mentor: '王建国',
  entryDate: '2026-04-15',
  phase: '第 7 周',
  school: '浙江大学',
  major: '计算机科学',
  fitScore: 52,
  riskLevel: '高',
  potentialType: '技术型',
  weeklyGoals: [
    { id: 1, text: '完成登录模块单元测试', status: 'done', dueDate: '05-26' },
    { id: 2, text: '学习 React Hooks 最佳实践', status: 'progress', dueDate: '05-30' },
    { id: 3, text: '参与一次代码 Review', status: 'pending', dueDate: '06-02' },
    { id: 4, text: '输出模块学习笔记', status: 'pending', dueDate: '06-03' },
  ],
  learningPath: [
    { week: 1, title: '入职引导', tasks: ['完成入职培训', '熟悉开发环境', '了解团队文化'], status: 'done' },
    { week: 2, title: '基础学习', tasks: ['学习项目架构', '阅读核心代码', '搭建本地环境'], status: 'done' },
    { week: 3, title: '任务实践', tasks: ['完成第一个小任务', '学习 Git 工作流', '参与周会'], status: 'done' },
    { week: 4, title: '能力提升', tasks: ['独立完成模块开发', '学习代码规范', '提交第一次 PR'], status: 'done' },
    { week: 5, title: '深入学习', tasks: ['参与技术方案讨论', '学习性能优化', '完成复杂任务'], status: 'done' },
    { week: 6, title: '团队协作', tasks: ['参与代码 Review', '协助新人', '输出技术分享'], status: 'done' },
    { week: 7, title: '当前阶段', tasks: ['独立负责子模块', '优化代码质量', '准备中期汇报'], status: 'current' },
    { week: 8, title: '下一阶段', tasks: ['参与架构设计', '带领小项目', '输出最佳实践'], status: 'pending' },
  ],
  mentorFeedbacks: [
    {
      week: 6,
      date: '05-25',
      rating: 3,
      strengths: '代码质量有提升，能主动提问',
      concerns: '任务预估时间不准，需要加强时间管理',
      suggestion: '建议使用番茄工作法，把大任务拆成小块',
    },
    {
      week: 5,
      date: '05-18',
      rating: 4,
      strengths: '学习能力强，能快速上手新技术',
      concerns: '周报内容过于简略，需要更详细的记录',
      suggestion: '建议每天花 10 分钟记录工作内容',
    },
  ],
  skills: [
    { name: 'React', level: 65, target: 80 },
    { name: 'TypeScript', level: 55, target: 75 },
    { name: 'Node.js', level: 45, target: 70 },
    { name: 'Git', level: 70, target: 80 },
    { name: '代码规范', level: 60, target: 85 },
    { name: '沟通协作', level: 50, target: 75 },
  ],
  weeklyReports: [
    {
      week: 6,
      date: '05-25',
      summary: '本周完成了登录模块的重构，学习了 React Hooks 的使用方法',
      difficulties: '在处理异步状态时遇到了一些问题，需要更深入理解 useEffect',
      emotion: 'positive',
      aiSummary: '整体表现稳定，技术能力在提升，建议关注异步编程的学习',
    },
    {
      week: 5,
      date: '05-18',
      summary: '参与了新功能的开发，完成了前端页面的搭建',
      difficulties: '对项目架构还不够熟悉，有时候不知道在哪里改代码',
      emotion: 'neutral',
      aiSummary: '需要加强对项目整体架构的理解，建议多阅读核心代码',
    },
  ],
};

const emotionConfig = {
  positive: { icon: <SmileOutlined />, color: '#5db872', label: '积极' },
  neutral: { icon: <HeartOutlined />, color: '#d4a017', label: '平稳' },
  negative: { icon: <ClockCircleOutlined />, color: '#c64545', label: '需要关注' },
};

export default function MyPage() {
  const [activeTab, setActiveTab] = useState('goals');

  const completedGoals = INTERN_DATA.weeklyGoals.filter(g => g.status === 'done').length;
  const totalGoals = INTERN_DATA.weeklyGoals.length;
  const goalProgress = Math.round((completedGoals / totalGoals) * 100);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 个人信息卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} md={6} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>{INTERN_DATA.avatar}</div>
            <Title level={4} style={{ margin: 0 }}>{INTERN_DATA.name}</Title>
            <Text type="secondary">{INTERN_DATA.position} · {INTERN_DATA.department}</Text>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#4f6dbd' }}>{INTERN_DATA.fitScore}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>适岗度</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>{INTERN_DATA.riskLevel}风险</Tag>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>风险等级</Text>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{INTERN_DATA.potentialType}</Tag>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>潜力类型</Text>
                  </div>
                </div>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>导师</Text>
                <div><Text strong>{INTERN_DATA.mentor}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>入职时间</Text>
                <div><Text strong>{INTERN_DATA.entryDate}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>学校</Text>
                <div><Text strong>{INTERN_DATA.school}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>阶段</Text>
                <div><Text strong>{INTERN_DATA.phase}</Text></div>
              </Col>
            </Row>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'center' }}>
            <Alert
              message="本周目标完成度"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Progress
              type="circle"
              percent={goalProgress}
              size={100}
              format={() => `${completedGoals}/${totalGoals}`}
              strokeColor={goalProgress >= 80 ? '#5db872' : goalProgress >= 50 ? '#d4a017' : '#c64545'}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* 左侧：本周目标 + 技能雷达 */}
        <Col xs={24} lg={8}>
          {/* 本周目标 */}
          <Card title={<><CalendarOutlined /> 本周目标</>} style={{ marginBottom: 16 }}>
            <List
              dataSource={INTERN_DATA.weeklyGoals}
              renderItem={item => (
                <List.Item
                  style={{ padding: '8px 0' }}
                  actions={[
                    item.status === 'done' ? (
                      <CheckCircleOutlined style={{ color: '#5db872' }} />
                    ) : item.status === 'progress' ? (
                      <ClockCircleOutlined style={{ color: '#d4a017' }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: '#b7b0a7' }} />
                    ),
                  ]}
                >
                  <Text
                    style={{
                      textDecoration: item.status === 'done' ? 'line-through' : 'none',
                      color: item.status === 'done' ? 'var(--muted)' : 'var(--ink)',
                    }}
                  >
                    {item.text}
                  </Text>
                </List.Item>
              )}
            />
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button type="primary" icon={<EditOutlined />} size="small">
                更新目标
              </Button>
            </div>
          </Card>

          {/* 技能雷达 */}
          <Card title={<><RiseOutlined /> 技能成长</>}>
            {INTERN_DATA.skills.map(skill => (
              <div key={skill.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>{skill.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {skill.level}/{skill.target}
                  </Text>
                </div>
                <Progress
                  percent={skill.level}
                  size="small"
                  showInfo={false}
                  strokeColor={skill.level >= skill.target ? '#5db872' : '#4f6dbd'}
                />
              </div>
            ))}
            <Alert
              message="本周重点提升"
              description="TypeScript 和沟通协作，建议多参与代码 Review 和技术讨论"
              type="info"
              showIcon
              style={{ marginTop: 12 }}
            />
          </Card>
        </Col>

        {/* 右侧：学习路径 + 导师反馈 + 周报 */}
        <Col xs={24} lg={16}>
          {/* 学习路径 */}
          <Card title={<><RocketOutlined /> 90 天学习路径</>} style={{ marginBottom: 16 }}>
            <Timeline
              items={INTERN_DATA.learningPath.map(item => ({
                color: item.status === 'done' ? 'green' : item.status === 'current' ? 'blue' : 'gray',
                children: (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Tag color={item.status === 'done' ? 'success' : item.status === 'current' ? 'processing' : 'default'}>
                        第 {item.week} 周
                      </Tag>
                      <Text strong>{item.title}</Text>
                      {item.status === 'current' && <Tag color="blue">当前</Tag>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.tasks.map((task, i) => (
                        <Tag key={i} style={{ fontSize: 11 }}>
                          {item.status === 'done' ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : null}
                          {task}
                        </Tag>
                      ))}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>

          <Row gutter={16}>
            {/* 导师反馈 */}
            <Col xs={24} md={12}>
              <Card title={<><TeamOutlined /> 导师反馈</>} style={{ marginBottom: 16 }}>
                {INTERN_DATA.mentorFeedbacks.map((feedback, i) => (
                  <div key={i} style={{ marginBottom: i < INTERN_DATA.mentorFeedbacks.length - 1 ? 16 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Space>
                        <Tag>第 {feedback.week} 周</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{feedback.date}</Text>
                      </Space>
                      <Rate disabled defaultValue={feedback.rating} style={{ fontSize: 14 }} />
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>优点：</Text>
                      <Text style={{ fontSize: 13 }}>{feedback.strengths}</Text>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>关注：</Text>
                      <Text style={{ fontSize: 13 }}>{feedback.concerns}</Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>建议：</Text>
                      <Text style={{ fontSize: 13, color: '#4f6dbd' }}>{feedback.suggestion}</Text>
                    </div>
                    {i < INTERN_DATA.mentorFeedbacks.length - 1 && <Divider style={{ margin: '12px 0' }} />}
                  </div>
                ))}
              </Card>
            </Col>

            {/* 周报记录 */}
            <Col xs={24} md={12}>
              <Card title={<><BookOutlined /> 周报记录</>}>
                {INTERN_DATA.weeklyReports.map((report, i) => {
                  const emotion = emotionConfig[report.emotion as keyof typeof emotionConfig];
                  return (
                    <div key={i} style={{ marginBottom: i < INTERN_DATA.weeklyReports.length - 1 ? 16 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space>
                          <Tag>第 {report.week} 周</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{report.date}</Text>
                        </Space>
                        <Tag icon={emotion.icon} color={emotion.color}>
                          {emotion.label}
                        </Tag>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>本周内容：</Text>
                        <Paragraph style={{ fontSize: 13, marginBottom: 4 }} ellipsis={{ rows: 2 }}>
                          {report.summary}
                        </Paragraph>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>遇到困难：</Text>
                        <Paragraph style={{ fontSize: 13, marginBottom: 4 }} ellipsis={{ rows: 2 }}>
                          {report.difficulties}
                        </Paragraph>
                      </div>
                      <Alert
                        message="AI 分析"
                        description={report.aiSummary}
                        type="info"
                        showIcon
                        style={{ fontSize: 12 }}
                      />
                      {i < INTERN_DATA.weeklyReports.length - 1 && <Divider style={{ margin: '12px 0' }} />}
                    </div>
                  );
                })}
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button type="primary" icon={<EditOutlined />} size="small">
                    提交本周周报
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}
