export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',

  database: {
    url: process.env.DATABASE_URL,
  },

  solana: {
    receiverAddress: process.env.SOLANA_RECEIVER_ADDRESS,
    network: process.env.SOLANA_NETWORK || 'solana-devnet',
  },

  base: {
    network: process.env.BASE_NETWORK || 'base-sepolia',
    proxyPrivateKey: process.env.BASE_PROXY_PRIVATE_KEY,
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  facilitator: {
    url: process.env.FACILITATOR_URL || 'https://x402.org/facilitator',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 10,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});
