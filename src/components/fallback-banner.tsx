'use client';

import { Alert } from 'antd';

/**
 * 当 API 请求失败、页面静默回退到 fallback/demo 数据时显示的横幅。
 * 让用户（和运维）能一眼看出当前看到的不是真实数据。
 */
export function FallbackBanner({
  visible,
  label = '当前页面',
}: {
  visible: boolean;
  label?: string;
}) {
  if (!visible) return null;
  return (
    <Alert
      type="warning"
      showIcon
      banner
      message={`${label}数据加载失败，当前显示的是演示数据`}
      style={{ marginBottom: 12, borderRadius: 6 }}
    />
  );
}
