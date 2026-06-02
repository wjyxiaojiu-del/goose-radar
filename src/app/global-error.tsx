'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
        <h1>系统错误</h1>
        <p>{error.message || '请刷新页面重试'}</p>
        <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          刷新页面
        </button>
      </body>
    </html>
  );
}
