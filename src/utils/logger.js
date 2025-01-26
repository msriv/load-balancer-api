import pino from "pino";

// Configure Pino logger
const development = {
  level: process.env.LOG_LEVEL || "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
};

const production = {
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    env: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME || "coda-payments",
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
};

export const logger = pino(
  process.env.NODE_ENV === "production" ? production : development,
);

logger.serializers = {
  err: pino.stdSerializers.err,
  req: pino.stdSerializers.req,
  res: pino.stdSerializers.res,
};
