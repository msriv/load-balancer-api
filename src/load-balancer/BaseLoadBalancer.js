export class BaseLoadBalancer {
  constructor(logger) {
    this.services = [];
    this.logger = logger;
    this.startHealthChecks();
  }

  startHealthChecks() {
    setInterval(() => {
      this.checkServicesHealth();
    }, 5000); // Check every 5 seconds
  }

  deregisterService(host, port) {
    this.services = this.services.filter(
      (service) => service.host !== host && service.port !== port,
    );
  }

  registerService(host, port) {
    if (!host || !port) {
      throw new Error("Host and port are required");
    }

    if (typeof host !== "string" || typeof port !== "number") {
      throw new Error("Invalid host or port format");
    }

    if (
      !this.services.some(
        (service) => service.host === host && service.port === port,
      )
    ) {
      this.services.push(this.createServiceEntry(host, port));
    }
  }

  async checkServicesHealth() {
    for (const service of this.services) {
      try {
        const response = await fetch(
          `http://${service.host}:${service.port}/healthz`,
          {
            timeout: 3000,
          },
        );
        service.healthy = response.ok;
      } catch (error) {
        service.healthy = false;
        this.logger.warn(
          {
            service: `${service.host}:${service.port}`,
            error: error.message,
          },
          "Service health check failed",
        );
      }
    }
  }

  // Get only healthy services
  getHealthyServices() {
    return this.services.filter((service) => service.healthy);
  }

  createServiceEntry(host, port) {
    throw new Error("createServiceEntry must be implemented by child class");
  }

  getNextService() {
    throw new Error("getNextService must be implemented by child class");
  }
}
