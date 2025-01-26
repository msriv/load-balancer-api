import http from "node:http";
import { Application } from "../src/application.js";
import { logger } from "../src/utils/logger";
import config from "../src/config/config";

// Mocks
jest.mock("node:http");
jest.mock("../src/utils/logger");
jest.mock("../src/config/config");

describe("Application", () => {
  let app;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup basic mocks
    http.createServer.mockReturnValue({
      on: jest.fn(),
      listen: jest.fn(),
      close: jest.fn(),
      timeout: 0,
      keepAliveTimeout: 0,
    });

    logger.child.mockReturnValue(logger);

    app = new Application();
  });

  test("should create server with correct configuration", () => {
    expect(http.createServer).toHaveBeenCalled();
    expect(app.server.timeout).toBe(config.server.timeout);
    expect(app.server.keepAliveTimeout).toBe(config.server.keepAliveTimeout);
  });

  test("should properly initialize logger", () => {
    expect(app.logger).toBeDefined();
    expect(app.logger).toBe(logger);
  });

  test("should start server with correct port and host", () => {
    const mockPort = 3000;
    const mockHost = "localhost";

    config.server.port = mockPort;
    config.server.host = mockHost;

    app.start();

    expect(app.server.listen).toHaveBeenCalledWith(
      mockPort,
      mockHost,
      expect.any(Function),
    );
  });

  test("should set up error handling on server start", () => {
    const serverOnSpy = jest.spyOn(app.server, "on");
    const processOnSpy = jest.spyOn(process, "on");

    app.start();

    expect(serverOnSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith(
      "uncaughtException",
      expect.any(Function),
    );
    expect(processOnSpy).toHaveBeenCalledWith(
      "unhandledRejection",
      expect.any(Function),
    );
  });

  test("should properly shutdown server", () => {
    const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});

    app.shutdown();

    expect(app.server.close).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("Shutting down server...");
  });
});
