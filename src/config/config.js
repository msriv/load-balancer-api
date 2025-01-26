export default {
  loadBalancer: {
    type: process.env.LOAD_BALANCER_TYPE || "static",
  },
  backendServices: [
    { host: "localhost", port: 3000 },
    { host: "localhost", port: 3001 },
    { host: "localhost", port: 3002 },
  ],
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || "localhost",
    timeout: 10000,
    keepAliveTimeout: 5000,
  },
  retry: {
    maxAttempts: 3,
    backoffFactor: 2,
    minTimeout: 1000,
    maxTimeout: 5000,
  },
};
