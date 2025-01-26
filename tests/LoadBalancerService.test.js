import http from "node:http";
import { LoadBalancerService } from "../src/load-balancer/service";
import { StaticLoadBalancer } from "../src/load-balancer/StaticLoadBalancer";
import { LRTLoadBalancer } from "../src/load-balancer/LRTLoadBalancer";
import request from "supertest";
import nock from "nock";

const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

let mockChildLogger;

beforeEach(() => {
  mockChildLogger = createMockLogger(); // Reinitialize before each test
});

// Mock the logger module
jest.mock("../src/utils/logger", () => ({
  logger: {
    child: jest.fn().mockImplementation(() => mockChildLogger),
  },
}));

// Mock the config module
jest.mock("../src/config/config", () => ({
  __esModule: true,
  default: {
    loadBalancer: {
      type: "static",
    },
    backendServices: [
      { host: "localhost", port: 3000 },
      { host: "localhost", port: 3001 },
    ],
    server: {
      host: "localhost",
      port: 8080,
    },
  },
}));

// Mock the StaticLoadBalancer
jest.mock("../src/load-balancer/StaticLoadBalancer", () => ({
  StaticLoadBalancer: jest.fn().mockImplementation(() => ({
    registerService: jest.fn(),
    getNextService: jest.fn(),
    services: [],
  })),
}));

// Mock the LRTLoadBalancer
jest.mock("../src/load-balancer/LRTLoadBalancer", () => ({
  LRTLoadBalancer: jest.fn().mockImplementation(() => ({
    registerService: jest.fn(),
    getNextService: jest.fn(),
    services: [],
    updateResponseTime: jest.fn(),
  })),
}));

// Mock http module
const mockServer = {
  listen: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
};

jest.mock("node:http", () => ({
  createServer: jest.fn().mockImplementation((handler) => {
    mockServer.handler = handler;
    return mockServer;
  }),
  request: jest.fn(),
}));

describe("LoadBalancerService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");
  });

  describe("Backend Service Registration", () => {
    test("should register configured backend services", () => {
      const service = new LoadBalancerService();
      const mockLb = service.lb;

      expect(mockLb.registerService).toHaveBeenCalledTimes(2);
      expect(mockLb.registerService).toHaveBeenCalledWith("localhost", 3000);
      expect(mockLb.registerService).toHaveBeenCalledWith("localhost", 3001);
    });
  });

  describe("Server Creation", () => {
    test("should create HTTP server", () => {
      const service = new LoadBalancerService();
      expect(http.createServer).toHaveBeenCalled();
    });
  });

  describe("Shutdown", () => {
    test("should handle shutdown correctly", () => {
      const service = new LoadBalancerService();
      service.shutdown();
      expect(mockServer.close).toHaveBeenCalled();
    });
  });
});
