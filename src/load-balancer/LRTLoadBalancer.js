import { BaseLoadBalancer } from "./BaseLoadBalancer.js";

export class LRTLoadBalancer extends BaseLoadBalancer {
  constructor(logger) {
    super(logger);
  }

  createServiceEntry(host, port) {
    if (!host || !port) {
      throw new Error("Host and port are required");
    }

    return {
      host,
      port,
      avgResponseTime: 0,
      totalRequests: 0,
      totalResponseTime: 0,
    };
  }

  getNextService() {
    const healthyServices = this.getHealthyServices();
    if (healthyServices.length === 0) {
      throw new Error("No healthy services available");
    }
    return healthyServices.reduce((fastest, current) => {
      if (!fastest) return current;
      return current.avgResponseTime < fastest.avgResponseTime
        ? current
        : fastest;
    });
  }

  // Additional method specific to LRT
  updateResponseTime(host, port, responseTime) {
    if (responseTime < 0) {
      throw new Error("Response time cannot be negative");
    }
    const service = this.services.find(
      (s) => s.host === host && s.port === port,
    );
    if (!service) {
      throw new Error(`Service ${host}:${port} not found`);
    }
    service.totalRequests++;
    service.totalResponseTime += responseTime;
    service.avgResponseTime = service.totalResponseTime / service.totalRequests;
  }
}
