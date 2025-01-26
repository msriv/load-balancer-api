import { LRTLoadBalancer } from "../src/load-balancer/LRTLoadBalancer";

// Mock the BaseLoadBalancer
jest.mock("../src/load-balancer/BaseLoadBalancer");

describe("LRTLoadBalancer", () => {
  let loadBalancer;
  let mockLogger;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    // Initialize load balancer
    loadBalancer = new LRTLoadBalancer(mockLogger);
  });

  // 1. Constructor Tests
  describe("constructor", () => {
    test("should create instance of LRTLoadBalancer", () => {
      expect(loadBalancer).toBeInstanceOf(LRTLoadBalancer);
    });
  });

  // 2. Service Entry Creation Tests
  describe("createServiceEntry", () => {
    test("should create valid service entry with initial values", () => {
      const entry = loadBalancer.createServiceEntry("localhost", 8080);

      expect(entry).toEqual({
        host: "localhost",
        port: 8080,
        avgResponseTime: 0,
        totalRequests: 0,
        totalResponseTime: 0,
      });
    });

    test("should throw error when host is missing", () => {
      expect(() => loadBalancer.createServiceEntry(null, 8080)).toThrow(
        "Host and port are required",
      );
    });

    test("should throw error when port is missing", () => {
      expect(() => loadBalancer.createServiceEntry("localhost", null)).toThrow(
        "Host and port are required",
      );
    });
  });

  // 3. Next Service Selection Tests
  describe("getNextService", () => {
    beforeEach(() => {
      // Mock getHealthyServices method
      loadBalancer.getHealthyServices = jest.fn();
    });

    test("should return service with lowest average response time", () => {
      const mockServices = [
        { host: "host1", port: 8081, avgResponseTime: 100 },
        { host: "host2", port: 8082, avgResponseTime: 50 },
        { host: "host3", port: 8083, avgResponseTime: 150 },
      ];

      loadBalancer.getHealthyServices.mockReturnValue(mockServices);

      const result = loadBalancer.getNextService();
      expect(result).toEqual(mockServices[1]);
    });

    test("should throw error when no healthy services available", () => {
      loadBalancer.getHealthyServices.mockReturnValue([]);

      expect(() => loadBalancer.getNextService()).toThrow(
        "No healthy services available",
      );
    });
  });

  // 4. Response Time Update Tests
  describe("updateResponseTime", () => {
    beforeEach(() => {
      loadBalancer.services = [
        {
          host: "localhost",
          port: 8080,
          avgResponseTime: 100,
          totalRequests: 2,
          totalResponseTime: 200,
        },
      ];
    });

    test("should correctly update service metrics", () => {
      loadBalancer.updateResponseTime("localhost", 8080, 300);

      const updatedService = loadBalancer.services[0];
      expect(updatedService.totalRequests).toBe(3);
      expect(updatedService.totalResponseTime).toBe(500);
      expect(updatedService.avgResponseTime).toBe(500 / 3);
    });

    test("should throw error for negative response time", () => {
      expect(() =>
        loadBalancer.updateResponseTime("localhost", 8080, -1),
      ).toThrow("Response time cannot be negative");
    });

    test("should throw error for non-existent service", () => {
      expect(() =>
        loadBalancer.updateResponseTime("unknown", 9999, 100),
      ).toThrow("Service unknown:9999 not found");
    });
  });

  // 5. Edge Cases
  describe("edge cases", () => {
    test("should handle zero response time update", () => {
      loadBalancer.services = [
        {
          host: "localhost",
          port: 8080,
          avgResponseTime: 100,
          totalRequests: 1,
          totalResponseTime: 100,
        },
      ];

      loadBalancer.updateResponseTime("localhost", 8080, 0);

      const service = loadBalancer.services[0];
      expect(service.avgResponseTime).toBe(50); // (100 + 0) / 2
    });

    test("should handle multiple services with same response time", () => {
      const mockServices = [
        { host: "host1", port: 8081, avgResponseTime: 100 },
        { host: "host2", port: 8082, avgResponseTime: 100 },
      ];

      loadBalancer.getHealthyServices.mockReturnValue(mockServices);

      const result = loadBalancer.getNextService();
      expect(result).toEqual(mockServices[0]); // Should return first one
    });
  });
});
