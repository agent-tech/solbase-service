import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PREFIX: Joi.string().default('api'),

  DATABASE_URL: Joi.string().required(),

  SOLANA_RECEIVER_ADDRESS: Joi.string().required(),
  SOLANA_NETWORK: Joi.string()
    .valid('solana-devnet', 'solana-mainnet-beta')
    .default('solana-devnet'),

  BASE_NETWORK: Joi.string().valid('base-sepolia', 'base').default('base-sepolia'),
  BASE_PROXY_PRIVATE_KEY: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .required()
    .messages({
      'string.pattern.base': 'BASE_PROXY_PRIVATE_KEY must be a valid hex private key (0x + 64 hex chars)',
    }),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  FACILITATOR_URL: Joi.string().uri().default('https://x402.org/facilitator'),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('debug'),
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(10),
});
