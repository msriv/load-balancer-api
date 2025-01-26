import http from "node:http";
import { StaticLoadBalancer } from "./StaticLoadBalancer.js";
import { LRTLoadBalancer } from "./LRTLoadBalancer.js";
import { logger } from "../utils/logger.js";
import config from "../config/config.js";

export class LoadBalancerService {
  constructor() {
    this.logger = this.initializeLogger();
    this.lb = this.initializeLoadBalancer(this.logger);
    this.server = this.createServer();
    this.registerBackendServices();
  }

  initializeLoadBalancer(logger) {
    const type = config.loadBalancer.type.toLowerCase();
    switch (type) {
      case "static":
        return new StaticLoadBalancer(logger);
      case "lrt":
        return new LRTLoadBalancer(logger);
      default:
        throw new Error(`Unknown load balancer type: ${type}`);
    }
  }

  initializeLogger() {
    return logger.child({
      component: "load-balancer",
      type: config.loadBalancer.type,
      instanceId: Math.random().toString(36).substring(2, 10),
    });
  }

  registerBackendServices() {
    this.logger.info("Registering backend services");
    config.backendServices.forEach((service) => {
      this.lb.registerService(service.host, service.port);
      this.logger.info(
        {
          host: service.host,
          port: service.port,
        },
        "Service registered",
      );
    });

    // Log total registered services
    this.logger.info(
      {
        totalServices: this.lb.services.length,
      },
      "Backend services registration complete",
    );
  }

  createRequestLogger(req) {
    return this.logger.child({
      reqId: Math.random().toString(36).substring(2, 15),
      method: req.method,
      path: req.url,
      sourceIp: req.socket.remoteAddress,
    });
  }

  async handleProxyRequest(
    req,
    res,
    nextService,
    bodyString,
    reqLogger,
    startTime,
  ) {
    const { host, port } = nextService;

    const options = {
      hostname: host,
      port: port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
      },
    };

    reqLogger.debug({ proxyOptions: options }, "Proxy request options");

    return new Promise((resolve, reject) => {
      const proxyReq = http.request(options);

      // Set timeout
      proxyReq.setTimeout(5000);

      proxyReq.on("timeout", () => {
        reqLogger.error("Proxy request timeout");
        proxyReq.destroy();
        if (!res.headersSent) {
          res.writeHead(504, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Gateway Timeout" }));
        }
        reject(new Error("Gateway Timeout"));
      });

      proxyReq.on("response", (proxyRes) => {
        const responseTime = Date.now() - startTime;

        if (this.lb instanceof LRTLoadBalancer) {
          this.lb.updateResponseTime(host, port, responseTime);
        }

        reqLogger.info(
          {
            statusCode: proxyRes.statusCode,
            responseHeaders: proxyRes.headers,
            responseTime,
          },
          "Received response from backend",
        );

        // Forward the response headers
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // Pipe the response data
        proxyRes.pipe(res);

        proxyRes.on("end", () => {
          resolve();
        });

        proxyRes.on("error", (error) => {
          reqLogger.error({ error }, "Error in proxy response stream");
          if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Bad Gateway" }));
          }
          reject(error);
        });
      });

      proxyReq.on("error", (err) => {
        reqLogger.error(
          {
            err,
            targetService: `${host}:${port}`,
          },
          "Error forwarding request to backend",
        );
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Bad Gateway" }));
        }
        reject(err);
      });

      // Write the body data if it exists
      if (bodyString) {
        reqLogger.debug(
          { bodyLength: bodyString.length },
          "Forwarding request body",
        );
        proxyReq.write(bodyString);
      }

      // End the request
      proxyReq.end();
    });
  }

  createServer() {
    return http.createServer((req, res) => {
      let bodyString = "";
      const startTime = Date.now();
      const reqLogger = this.createRequestLogger(req);

      reqLogger.info("Incoming request");
      reqLogger.debug({ headers: req.headers }, "Request headers");

      req.on("close", () => {
        reqLogger.info("Client closed connection early");
      });

      req.on("data", (stream) => (bodyString += stream.toString()));

      req.on("end", async () => {
        try {
          const nextService = this.lb.getNextService();

          if (!nextService) {
            reqLogger.warn("No available backend services");
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No available services" }));
            return;
          }

          reqLogger.info(
            { service: `${nextService.host}:${nextService.port}` },
            "Forwarding request",
          );

          await this.handleProxyRequest(
            req,
            res,
            nextService,
            bodyString,
            reqLogger,
            startTime,
          );

          reqLogger.debug("Proxy request completed");
        } catch (err) {
          reqLogger.error({ err }, "Internal error in load balancer");
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
          }
        }
      });

      req.on("error", (err) => {
        reqLogger.error({ err }, "Error processing incoming request");
        if (!res.headersSent) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Bad Request" }));
        }
      });
    });
  }

  setupErrorHandling() {
    this.server.on("error", (err) => {
      this.logger.error({ err }, "Load balancer server error");
    });

    process.on("SIGTERM", () => {
      this.logger.info("Received SIGTERM signal");
      this.shutdown();
    });

    process.on("uncaughtException", (err) => {
      this.logger.fatal({ err }, "Uncaught exception");
      this.shutdown(1);
    });

    process.on("unhandledRejection", (reason) => {
      this.logger.fatal({ err: reason }, "Unhandled promise rejection");
      this.shutdown(1);
    });
  }

  shutdown(exitCode = 0) {
    this.server.close(() => {
      this.logger.info("Load balancer shut down complete");
      process.exit(exitCode);
    });
  }

  start() {
    const { port, host } = config.server;

    this.setupErrorHandling();

    this.server.listen(port, host, () => {
      this.logger.info({ port, host }, "Load Balancer started");
    });
  }
}

// Start the service
if (require.main === module) {
  const service = new LoadBalancerService();
  service.start();
}
