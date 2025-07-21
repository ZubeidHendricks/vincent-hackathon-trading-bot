import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

// Ref: https://github.com/t3-oss/t3-env/pull/145
const booleanStrings = ['true', 'false', true, false, '1', '0', 'yes', 'no', 'y', 'n', 'on', 'off'];
const BooleanOrBooleanStringSchema = z
  .any()
  .refine((val) => booleanStrings.includes(val), { message: 'must be boolean' })
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const normalized = val.toLowerCase().trim();
      if (['true', 'yes', 'y', '1', 'on'].includes(normalized)) return true;
      if (['false', 'no', 'n', '0', 'off'].includes(normalized)) return false;
      throw new Error(`Invalid boolean string: "${val}"`);
    }
    throw new Error(`Expected boolean or boolean string, got: ${typeof val}`);
  });

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    ALLOWED_AUDIENCE: z.string().url(),
    BASE_RPC_URL: z.string().url(),
    COINRANKING_API_KEY: z.string(),
    CORS_ALLOWED_DOMAIN: z.string(),
    IS_DEVELOPMENT: BooleanOrBooleanStringSchema,
    MONGODB_URI: z.string().url(),
    PORT: z.coerce.number(),
    RECALL_NETWORK_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    RECALL_NETWORK_PRODUCTION_API_KEY: z.string(),
    RECALL_NETWORK_SANDBOX_API_KEY: z.string(),
    VINCENT_APP_VERSION: z.coerce.number(),
    VINCENT_DELEGATEE_PRIVATE_KEY: z.string(),
  },
});
