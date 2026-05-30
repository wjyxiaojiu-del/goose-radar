'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Tag, Space } from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  RightOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  page: string;
  highlight?: string;
  action?: 'click' | 'wait';
  actionTarget?: string;
  autoAdvanceMs?: number;
}

const STEPS: DemoStep[] = [
  {
    id: 0,
    title: '欢迎来到鹅苗雷达',
    description: '这是一个 AI 驱动的实习生管理平台。接下来将为您演示完整的 HR 干预工作流。',
    page: '/',
    autoAdvanceMs: 3000,
  },
  {
    id: 1,
    title: 'AI 雷达扫描',
    description: '仪表盘展示本周扫描结果：发现高风险 + 中风险实习生，以及高潜人才。AI 自动生成今日提醒。',
    page: '/',
    highlight: '[data-demo="ai-banner"]',
    autoAdvanceMs: 5000,
  },
  {
    id: 2,
    title: '进入干预方案',
    description: '以高风险实习生「张晨」为例，查看 AI 生成的完整干预方案。',
    page: '/interventions/__ZhangChen__',
    highlight: '[data-demo="intervention-header"]',
    autoAdvanceMs: 4000,
  },
  {
    id: 3,
    title: 'AI 工作流时间线',
    description: 'AI 自动完成：读取周报 → 识别风险 → 生成话术 → 生成导师提纲 → 生成培养任务，全程可视化。',
    page: '/interventions/__ZhangChen__',
    highlight: '[data-demo="workflow-timeline"]',
    autoAdvanceMs: 5000,
  },
  {
    id: 4,
    title: '一键复制 HR 话术',
    description: 'HR 可直接复制 AI 生成的沟通话术，包含开场、跟进提问和收尾，即拿即用。',
    page: '/interventions/__ZhangChen__',
    highlight: '[data-demo="copy-script"]',
    action: 'click',
    actionTarget: '[data-demo="copy-script"]',
    autoAdvanceMs: 3000,
  },
  {
    id: 5,
    title: '标记本周跟进',
    description: '一键将该实习生标记为本周跟进对象，HR 工作流闭环。',
    page: '/interventions/__ZhangChen__',
    highlight: '[data-demo="mark-followup"]',
    action: 'click',
    actionTarget: '[data-demo="mark-followup"]',
    autoAdvanceMs: 3000,
  },
  {
    id: 6,
    title: '返回风险预警',
    description: '回到风险预警总览，查看所有需要关注的实习生。',
    page: '/alerts',
    highlight: '[data-demo="alerts-table"]',
    autoAdvanceMs: 4000,
  },
  {
    id: 7,
    title: '演示完成',
    description: '从「发现问题」→「AI 分析」→「生成方案」→「HR 介入」→「标记跟进」，鹅苗雷达让实习生管理从经验驱动变成数据与 AI 协同。',
    page: '/alerts',
    autoAdvanceMs: 0,
  },
];

export default function DemoMode() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [primaryCaseId, setPrimaryCaseId] = useState<string | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick a stable demo case when demo starts: prefer 张晨, otherwise use the highest-risk intern.
  useEffect(() => {
    if (active && !primaryCaseId) {
      fetch('/api/interns')
        .then(res => res.json())
        .then(interns => {
          if (!Array.isArray(interns) || interns.length === 0) return;
          const zc = interns.find((i: { name: string }) => i.name === '张晨');
          const highestRisk = [...interns].sort((a: { riskScore?: number }, b: { riskScore?: number }) => (b.riskScore ?? 0) - (a.riskScore ?? 0))[0];
          const selected = zc || highestRisk;
          if (selected?.id) setPrimaryCaseId(selected.id);
        })
        .catch(() => {});
    }
  }, [active, primaryCaseId]);

  const getStepPage = useCallback((step: DemoStep): string => {
    if (step.page.includes('__ZhangChen__')) {
      return primaryCaseId ? step.page.replace('__ZhangChen__', primaryCaseId) : '/alerts';
    }
    return step.page;
  }, [primaryCaseId]);

  // Navigate to step page
  useEffect(() => {
    if (!active || paused) return;
    const step = STEPS[currentStep];
    if (!step) return;
    const targetPage = getStepPage(step);
    if (pathname !== targetPage) {
      router.push(targetPage);
    }
  }, [active, paused, currentStep, pathname, router, getStepPage]);

  // Update highlight position
  const highlightSelector = active && !paused ? STEPS[currentStep]?.highlight ?? null : null;

  useEffect(() => {
    if (!highlightSelector) return;

    let rafId: number;
    const updateRect = () => {
      const el = document.querySelector(highlightSelector);
      setHighlightRect(el ? el.getBoundingClientRect() : null);
      rafId = requestAnimationFrame(updateRect);
    };
    rafId = requestAnimationFrame(updateRect);
    return () => {
      cancelAnimationFrame(rafId);
      setHighlightRect(null);
    };
  }, [highlightSelector]);

  // Execute action & auto-advance
  useEffect(() => {
    if (!active || paused) return;
    const step = STEPS[currentStep];
    if (!step) return;

    // Execute click action after a delay
    if (step.action === 'click' && step.actionTarget) {
      const clickTimer = setTimeout(() => {
        const el = document.querySelector(step.actionTarget!) as HTMLElement;
        if (el) el.click();
      }, 1500);
      return () => clearTimeout(clickTimer);
    }
  }, [active, paused, currentStep]);

  // Auto-advance timer
  useEffect(() => {
    if (!active || paused) return;
    const step = STEPS[currentStep];
    if (!step?.autoAdvanceMs || step.autoAdvanceMs === 0) return;

    timerRef.current = setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }, step.autoAdvanceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, paused, currentStep]);

  const startDemo = () => {
    setActive(true);
    setCurrentStep(0);
    setPaused(false);
  };

  const stopDemo = () => {
    setActive(false);
    setCurrentStep(0);
    setPaused(false);
    setHighlightRect(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      stopDemo();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!active) {
    return (
      <div className="demo-launcher">
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          onClick={startDemo}
          className="demo-launcher-button"
        >
          评审演示模式
        </Button>
      </div>
    );
  }

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        className={highlightRect ? 'demo-overlay is-spotlighting' : 'demo-overlay'}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Highlight spotlight */}
      {highlightRect && (
        <div
          style={{
            position: 'fixed',
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 18px 44px rgba(0, 0, 0, 0.24)',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'all 0.4s ease',
            border: '2px solid #f2b08d',
          }}
        />
      )}

      <div className="demo-control-panel">
        <div className="demo-control-card">
          <div className="demo-card-header">
            <Space>
              <Tag color="volcano" style={{ fontSize: 12, marginInlineEnd: 0 }}>
                {currentStep + 1} / {STEPS.length}
              </Tag>
              <span className="demo-step-title">{step.title}</span>
            </Space>
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={paused ? <PlayCircleOutlined /> : <PauseOutlined />}
                onClick={() => setPaused(!paused)}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={stopDemo}
              />
            </Space>
          </div>

          <p className="demo-step-description">
            {step.description}
          </p>

          <div className="demo-step-strip">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={i <= currentStep ? 'is-active' : ''}
              />
            ))}
          </div>

          <div className="demo-card-actions">
            <Button
              size="small"
              disabled={currentStep === 0}
              onClick={prevStep}
            >
              上一步
            </Button>

            {isLast ? (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={stopDemo}
                className="demo-done-button"
              >
                完成演示
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<RightOutlined />}
                onClick={nextStep}
              >
                {step.autoAdvanceMs ? '跳过' : '下一步'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
