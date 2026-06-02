'use client';

import { useEffect } from 'react';
import { Button, Result } from 'antd';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <Result
      status="500"
      title="页面出错了"
      subTitle={error.message || '请稍后再试，或联系管理员'}
      extra={
        <Button type="primary" onClick={reset}>
          重试
        </Button>
      }
    />
  );
}
