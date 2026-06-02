import { describe, it, expect } from 'vitest';
import { sanitizeForPrompt, truncatePromptContext } from '../sanitize';

describe('sanitizeForPrompt', () => {
  it('正常文本原样返回', () => {
    expect(sanitizeForPrompt('hello world')).toBe('hello world');
  });

  it('null 返回空字符串', () => {
    expect(sanitizeForPrompt(null)).toBe('');
  });

  it('undefined 返回空字符串', () => {
    expect(sanitizeForPrompt(undefined)).toBe('');
  });

  it('移除花括号（防 JSON 注入）', () => {
    expect(sanitizeForPrompt('a{b}c')).toBe('abc');
  });

  it('移除控制字符', () => {
    expect(sanitizeForPrompt('a\x00b\x01c')).toBe('abc');
  });

  it('保留换行和制表符', () => {
    expect(sanitizeForPrompt("a\tb\nc")).toBe("a\tb\nc");
  });

  it('截断超长输入到默认 500 字符', () => {
    const long = 'x'.repeat(600);
    expect(sanitizeForPrompt(long)).toHaveLength(500);
  });

  it('截断到自定义长度', () => {
    const long = 'x'.repeat(100);
    expect(sanitizeForPrompt(long, 10)).toHaveLength(10);
  });

  it('去除首尾空格', () => {
    expect(sanitizeForPrompt('  hello  ')).toBe('hello');
  });
});

describe('truncatePromptContext', () => {
  it('短文本原样返回', () => {
    expect(truncatePromptContext('short')).toBe('short');
  });

  it('超长文本被截断并添加标记', () => {
    const long = 'a'.repeat(5000);
    const result = truncatePromptContext(long);
    expect(result).toHaveLength(4000 + '\n...[truncated]'.length);
    expect(result.endsWith('...[truncated]')).toBe(true);
  });

  it('自定义最大长度', () => {
    const result = truncatePromptContext('abcdef', 3);
    expect(result).toBe('abc\n...[truncated]');
  });
});
