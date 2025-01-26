import http from "node:http";
import { logger } from "./utils/logger.js";
import retry from "retry";
import config from "./config/config.js";

export class Application {
  constructor() {
    this.logger = logger;
    this.server = this.createServer();
    this.setupServerConfig();
  }

  setupServerConfig() {
    this.server.timeout = config.server.timeout;
    this.server.keepAliveTimeout = config.server.keepAliveTimeout;
  }

  createRequestLogger(req) {
    return this.logger.child({
      reqId: Math.random().toString(36).substring(2, 15),
      method: req.method,
      path: req.url,
    });
  }

  createRetryOperation() {
    return retry.operation({
      retries: config.retry.maxAttempts,
      factor: config.retry.backoffFactor,
      minTimeout: config.retry.minTimeout,
      maxTimeout: config.retry.maxTimeout,
      randomize: true,
    });
  }

  handleHealthCheck(req, res, reqLogger) {
    reqLogger.debug("Health check request received");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "healthy" }));
    reqLogger.info("Health check completed");
  }

  async handlePostRequest(req, res, reqLogger) {
    if (req.headers["content-type"] !== "application/json") {
      reqLogger.warn("Invalid content-type");
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("Invalid Content-Type Header");
      return;
    }

    const operation = this.createRetryOperation();

    operation.attempt(async (currentAttempt) => {
      this.processPostRequest(req, res, reqLogger, operation, currentAttempt);
    });
  }

  processPostRequest(req, res, reqLogger, operation, currentAttempt) {
    let bodyString = "";

    req.on("data", (stream) => {
      bodyString += stream.toString();
    });

    req.on("end", () => {
      try {
        reqLogger.debug({ body: bodyString }, "Received POST body");

        // // Simulate random failures
        // if (Math.random() < 0.3) {
        //   res.writeHead(500, { "content-type": "application/json" });
        //   res.end(JSON.stringify({ error: "Random processing error" }));
        //   throw new Error("Random processing error");
        // }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(bodyString);
        reqLogger.info("Request processed successfully");
      } catch (error) {
        this.handleOperationError(
          error,
          operation,
          currentAttempt,
          res,
          reqLogger,
        );
      }
    });

    req.on("error", (error) => {
      this.handleOperationError(
        error,
        operation,
        currentAttempt,
        res,
        reqLogger,
      );
    });
  }

  handleOperationError(error, operation, currentAttempt, res, reqLogger) {
    if (operation.retry(error)) {
      reqLogger.warn(
        {
          attempt: currentAttempt,
          error: error.message,
        },
        "Request failed, retrying",
      );
      return;
    }

    reqLogger.error({ err: error }, "All retry attempts failed");
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error - Retry attempts exhausted");
  }

  handleUnsupportedMethod(req, res, reqLogger) {
    reqLogger.warn(
      {
        method: req.method,
        path: req.url,
      },
      "Invalid request method or path",
    );
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Method Not Allowed");
    reqLogger.info("Responded with 405 - Method Not Allowed");
  }

  createServer() {
    return http.createServer((req, res) => {
      const reqLogger = this.createRequestLogger(req);
      reqLogger.info("Incoming request");
      reqLogger.debug({ headers: req.headers }, "Request headers");

      // Add health check endpoint
      if (req.method === "GET" && req.url === "/healthz") {
        this.handleHealthCheck(req, res, reqLogger);
      } else if (req.method === "POST") {
        this.handlePostRequest(req, res, reqLogger);
      } else {
        this.handleUnsupportedMethod(req, res, reqLogger);
      }
    });
  }

  setupErrorHandling() {
    this.server.on("error", (error) => {
      this.logger.error({ err: error }, "Server error occurred");
    });

    process.on("SIGTERM", () => {
      this.shutdown();
    });

    process.on("uncaughtException", (error) => {
      this.logger.fatal({ err: error }, "Uncaught Exception");
      this.shutdown(1);
    });

    process.on("unhandledRejection", (reason) => {
      this.logger.fatal({ err: reason }, "Unhandled Promise Rejection");
      this.shutdown(1);
    });
  }

  shutdown(exitCode = 0) {
    this.logger.info("Shutting down server...");
    this.server.close(() => {
      this.logger.info("Server shut down complete");
      process.exit(exitCode);
    });
  }

  start() {
    const port = process.env.PORT || config.server.port;
    const host = config.server.host;

    this.setupErrorHandling();

    this.server.listen(port, host, () => {
      this.logger.info({ port, host }, "Server started");
    });
  }
}

if (require.main === module) {
  const app = new Application();
  app.start();
}
