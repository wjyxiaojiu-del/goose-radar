'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  LoadingOutlined,
  CompassOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  { icon: <WarningOutlined />, text: '最近有哪些高风险实习生？' },
  { icon: <TeamOutlined />, text: '帮我列出所有高潜人才' },
  { icon: <BarChartOutlined />, text: '整体数据概况如何？' },
  { icon: <ThunderboltOutlined />, text: '张三最近状态怎么样？' },
  { icon: <CompassOutlined />, text: '谁需要导师重点关注？' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好！我是鹅苗雷达 AI 助手。\n\n我可以帮你：\n- 🔍 **查询实习生** — 按风险、岗位、导师筛选\n- 📊 **分析数据** — 整体概况、趋势对比\n- ⚠️ **风险预警** — 发现需要关注的人员\n- 💡 **给出建议** — 基于数据提供干预方案\n\n试试下方的快捷提问，或直接输入你的问题！',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Detect demo mode on first interaction
  const detectDemoMode = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json().catch(() => ({}));
      setIsDemoMode(!data.aiAvailable);
    } catch {
      setIsDemoMode(true);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    if (!isDemoMode) detectDemoMode();
    const userMsg: Message = { id: generateId(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '', isStreaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setLoading(true);

    abortRef.current = new AbortController();

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetchWithCsrf('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无响应');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.chunk) {
              fullText += json.chunk;
              setMessages(prev =>
                prev.map(m => (m.id === assistantMsg.id ? { ...m, content: fullText } : m))
              );
            }
            if (json.done) {
              setMessages(prev =>
                prev.map(m => (m.id === assistantMsg.id ? { ...m, isStreaming: false } : m))
              );
            }
            if (json.error) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, content: `⚠️ ${json.error}`, isStreaming: false, error: true } : m
                )
              );
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsg.id ? { ...m, content: '⏹️ 已取消', isStreaming: false } : m))
        );
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsg.id ? { ...m, content: '⚠️ 请求失败，请稍后重试', isStreaming: false, error: true } : m
          )
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 48px)', minHeight: 500 }}>
      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: 10,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: msg.role === 'user' ? '#cc785c' : '#181715',
                color: '#faf9f5',
                flexShrink: 0,
                fontSize: 14,
              }}
            >
              {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            </div>
            <div
              style={{
                maxWidth: 'min(600px, 80%)',
                padding: '10px 14px',
                borderRadius: 12,
                background: msg.role === 'user' ? '#cc785c' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#141413',
                fontSize: 14,
                lineHeight: 1.7,
                boxShadow: msg.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                border: msg.role === 'user' ? 'none' : '1px solid #e6dfd8',
              }}
            >
              {msg.role === 'assistant' ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content + (msg.isStreaming ? '▌' : '')}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingLeft: 42 }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s.text}
                onClick={() => handleSend(s.text)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: '1px solid #e6dfd8',
                  background: '#fff',
                  color: '#6c6a64',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#cc785c';
                  (e.currentTarget as HTMLElement).style.color = '#cc785c';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e6dfd8';
                  (e.currentTarget as HTMLElement).style.color = '#6c6a64';
                }}
              >
                {s.icon} {s.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {isDemoMode && (
        <div style={{ padding: '6px 16px', background: '#fff8e6', borderTop: '1px solid #f0d78c', fontSize: 12, color: '#8a6d3b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThunderboltOutlined />
          当前为演示模式 — AI 回答基于真实数据模板生成，部署配置 API Key 后可切换为实时 AI 对话
        </div>
      )}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e6dfd8',
          background: '#fff',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，AI 会查询实时数据回答你..."
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid #e6dfd8',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: 'inherit',
            outline: 'none',
            maxHeight: 120,
          }}
          onInput={e => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          }}
        />
        {loading ? (
          <button
            onClick={handleCancel}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: 'none',
              background: '#c64545',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LoadingOutlined spin />
          </button>
        ) : (
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: 'none',
              background: input.trim() ? '#cc785c' : '#ebe6df',
              color: '#fff',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SendOutlined />
          </button>
        )}
      </div>
    </div>
  );
}
