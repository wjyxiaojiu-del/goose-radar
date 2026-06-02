import { describe, it, expect } from 'vitest';
import { safeJsonParse, safeJsonStringify } from '../safe-json';

describe('safeJsonParse', () => {
  it('解析正常 JSON 对象', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('解析正常 JSON 数组', () => {
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('null 输入返回 fallback', () => {
    expect(safeJsonParse(null, 'fb')).toBe('fb');
  });

  it('undefined 输入返回 fallback', () => {
    expect(safeJsonParse(undefined, 42)).toBe(42);
  });

  it('畸形 JSON 返回 fallback', () => {
    expect(safeJsonParse('{broken', [])).toEqual([]);
  });

  it('空字符串返回 fallback', () => {
    expect(safeJsonParse('', false)).toBe(false);
  });
});

describe('safeJsonStringify', () => {
  it('序列化正常对象', () => {
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
  });

  it('序列化数组', () => {
    expect(safeJsonStringify([1, 2])).toBe('[1,2]');
  });

  it('处理循环引用返回空字符串', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    expect(safeJsonStringify(obj)).toBe('');
  });

  it('处理 undefined 返回 "undefined"（JSON.stringify 行为）', () => {
    expect(safeJsonStringify(undefined)).toBe(undefined as unknown as string);
  });
});
