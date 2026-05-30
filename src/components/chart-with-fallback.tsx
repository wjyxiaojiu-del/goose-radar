'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ECharts 图表包装器：ECharts chunk 慢加载时先显示 CSS 兜底视图，
 * chunk 就绪后平滑切换，避免图表卡片长时间空白。
 */
export function ChartWithFallback({ fallback, children, height = 210 }: {
  fallback: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}) {
  const [chartReady, setChartReady] = useState(false);
  const chartHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host) return;

    const markReadyWhenCanvasExists = () => {
      if (host.querySelector('canvas')) {
        setChartReady(true);
        return true;
      }
      return false;
    };

    if (markReadyWhenCanvasExists()) return;

    const observer = new MutationObserver(() => {
      if (markReadyWhenCanvasExists()) observer.disconnect();
    });
    observer.observe(host, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="chart-with-fallback" style={{ position: 'relative', minHeight: height }}>
      <div
        className="chart-fallback-layer"
        style={{
          opacity: chartReady ? 0 : 1,
          transition: 'opacity 0.3s ease',
          position: chartReady ? 'absolute' : 'relative',
          inset: chartReady ? 0 : undefined,
          pointerEvents: chartReady ? 'none' : 'auto',
          width: '100%',
          minHeight: height,
        }}
      >
        {fallback}
      </div>
      <div
        ref={chartHostRef}
        className="chart-echarts-layer"
        style={{
          opacity: chartReady ? 1 : 0,
          transition: 'opacity 0.3s ease',
          position: chartReady ? 'relative' : 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          minHeight: height,
        }}
      >
        {children}
      </div>
    </div>
  );
}
