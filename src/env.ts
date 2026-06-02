import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * 运行时环境变量校验
 * 启动时即失败（fail-fast），避免运行时才发现配置缺失
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    API_SECRET: z.string().min(1),
    AI_BASE_URL: z.string().url().optional(),
    AI_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().min(1).optional(),
    SKIP_API_AUTH: z.enum(['true', 'false']).optional(),
  },
  client: {
    // 客户端环境变量（必须以 NEXT_PUBLIC_ 开头）
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_SECRET: process.env.API_SECRET,
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    SKIP_API_AUTH: process.env.SKIP_API_AUTH,
  },
});
