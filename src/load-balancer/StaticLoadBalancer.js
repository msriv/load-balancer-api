import { BaseLoadBalancer } from "./BaseLoadBalancer.js";

export class StaticLoadBalancer extends BaseLoadBalancer {
  constructor(logger) {
    super(logger);
    this.currentIndex = 0;
  }

  createServiceEntry(host, port) {
    return {
      host,
      port,
    };
  }

  getNextService() {
    const healthyServices = this.getHealthyServices();
    if (healthyServices.length === 0) {
      throw new Error("No healthy services available");
    }
    const service = healthyServices[this.currentIndex % healthyServices.length];
    this.currentIndex = (this.currentIndex + 1) % healthyServices.length;
    return service;
  }
}
