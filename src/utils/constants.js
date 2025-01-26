export const SERVICE_STATUS = {
  HEALTHY: "healthy",
  UNHEALTHY: "unhealthy",
  UNKNOWN: "unknown", // for initialization state
  DRAINING: "draining", // For graceful shutdown
  STARTING: "starting", // For startup state
  SUSPENDED: "suspended", // For maintenance mode
  DEGRADED: "degraded", // For partial functionality
};
