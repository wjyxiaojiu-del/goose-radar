'use client';

import { useState, useEffect } from 'react';
import { Button, Steps, Card, Typography } from 'antd';
import {
  RocketOutlined,
  CloseOutlined,
  RadarChartOutlined,
  WarningOutlined,
  UserOutlined,
  BulbOutlined,
  StarOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Text } = Typography;

interface DemoStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  tip: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    title: '扫描总览',
    description: '查看 Dashboard，了解 20 名实习生的整体适岗情况',
    icon: <RadarChartOutlined />,
    href: '/',
    tip: '注意观察风险分布饼图和岗位对比柱状图',
  },
  {
    title: '发现风险',
    description: '进入预警池，查看需要关注的高风险实习生',
    icon: <WarningOutlined />,
    href: '/alerts',
    tip: '可以按风险类型筛选，点击查看详情',
  },
  {
    title: '深入分析',
    description: '查看实习生详情，了解能力雷达图和周报情感分析',
    icon: <UserOutlined />,
    href: '/interns/demo-001',
    tip: '观察周报中的情感信号变化趋势',
  },
  {
    title: 'AI 建议',
    description: '查看 AI 生成的 HR 行动建议和导师沟通模板',
    icon: <BulbOutlined />,
    href: '/suggestions',
    tip: 'AI 会根据风险类型生成个性化建议',
  },
  {
    title: '高潜人才',
    description: '识别高潜力实习生，推荐重点培养对象',
    icon: <StarOutlined />,
    href: '/potentials',
    tip: '高潜人才是团队未来的骨干力量',
  },
  {
    title: '实习生视角',
    description: '切换到实习生视角，查看个人成长目标和学习路径',
    icon: <UserOutlined />,
    href: '/my',
    tip: '多角色视角：HR 看全局、导师看个案、实习生看成长',
  },
  {
    title: '完成演示',
    description: '您已了解鹅苗雷达的完整功能闭环',
    icon: <CheckCircleOutlined />,
    href: '/',
    tip: '从风险发现到干预闭环，一屏讲清楚',
  },
];

export function DemoGuide() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 监听键盘快捷键 G 打开引导
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        setVisible(prev => !prev);
      }
      if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNext = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentDemoStep = DEMO_STEPS[currentStep];

  return (
    <>
      {/* 悬浮按钮 */}
      <Button
        type="primary"
        shape="circle"
        icon={<RocketOutlined />}
        size="large"
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          boxShadow: '0 4px 16px rgba(79,109,189,0.4)',
          zIndex: 1000,
          display: visible ? 'none' : 'flex',
        }}
        title="演示引导路径 (按 G 键打开)"
      />

      {/* 引导面板 */}
      {visible && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 380,
            zIndex: 1001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            borderRadius: 12,
          }}
        >
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>
                  <RocketOutlined style={{ marginRight: 8 }} />
                  演示引导路径
                </span>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => {
                    setVisible(false);
                    setCurrentStep(0);
                  }}
                />
              </div>
            }
            styles={{ body: { padding: '16px 24px' } }}
          >
            {/* 步骤指示器 */}
            <Steps
              current={currentStep}
              size="small"
              items={DEMO_STEPS.map(step => ({ title: step.title }))}
              style={{ marginBottom: 20 }}
            />

            {/* 当前步骤内容 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'var(--goose-blue-50, #e8f0fe)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: 'var(--goose-blue-500, #4f6dbd)',
                  }}
                >
                  {currentDemoStep.icon}
                </div>
                <div>
                  <Text strong style={{ fontSize: 15 }}>
                    {currentStep + 1}. {currentDemoStep.title}
                  </Text>
                </div>
              </div>

              <Text style={{ display: 'block', marginBottom: 8, color: 'var(--ink)' }}>
                {currentDemoStep.description}
              </Text>

              <div
                style={{
                  background: 'var(--surface-soft, #f5f5f5)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                💡 {currentDemoStep.tip}
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Button
                disabled={currentStep === 0}
                onClick={handlePrev}
              >
                上一步
              </Button>

              <Link href={currentDemoStep.href} onClick={() => setCurrentStep(prev => Math.min(prev + 1, DEMO_STEPS.length - 1))}>
                <Button type="primary">
                  {currentStep === DEMO_STEPS.length - 1 ? (
                    <>
                      <CheckCircleOutlined /> 完成
                    </>
                  ) : (
                    <>
                      前往查看 <ArrowRightOutlined />
                    </>
                  )}
                </Button>
              </Link>
            </div>

            {/* 快捷键提示 */}
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
              按 <kbd style={{ padding: '1px 4px', background: 'var(--surface-soft)', borderRadius: 3, fontSize: 10 }}>G</kbd> 键切换引导面板
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
