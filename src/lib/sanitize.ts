/**
 * LLM Prompt  sanitization
 * 防止提示注入攻击：截断超长输入、过滤特殊字符
 */

const MAX_PROMPT_LEN = 4000;

export function sanitizeForPrompt(input: string | null | undefined, maxLen = 500): string {
  if (!input) return '';
  return input
    .slice(0, maxLen)
    .replace(/[{}]/g, '') // 避免干扰 JSON 结构
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // 控制字符
    .trim();
}

export function truncatePromptContext(input: string, maxLen = MAX_PROMPT_LEN): string {
  if (input.length <= maxLen) return input;
  return input.slice(0, maxLen) + '\n...[truncated]';
}
