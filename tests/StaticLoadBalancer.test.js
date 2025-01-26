import { StaticLoadBalancer } from "../src/load-balancer/StaticLoadBalancer";

// Mock the BaseLoadBalancer
jest.mock("../src/load-balancer/BaseLoadBalancer");

describe("StaticLoadBalancer", () => {
  let loadBalancer;
  let mockLogger;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    // Initialize the load balancer
    loadBalancer = new StaticLoadBalancer(mockLogger);
  });

  describe("constructor", () => {
    test("should initialize with currentIndex as 0", () => {
      expect(loadBalancer.currentIndex).toBe(0);
    });
  });

  describe("createServiceEntry", () => {
    test("should create a valid service entry with host and port", () => {
      const host = "localhost";
      const port = 8080;

      const entry = loadBalancer.createServiceEntry(host, port);

      expect(entry).toEqual({
        host,
        port,
      });
    });
  });

  describe("getNextService", () => {
    test("should throw error when no healthy services are available", () => {
      // Mock getHealthyServices to return empty array
      loadBalancer.getHealthyServices = jest.fn().mockReturnValue([]);

      expect(() => {
        loadBalancer.getNextService();
      }).toThrow("No healthy services available");
    });

    test("should return services in round-robin fashion", () => {
      // Mock healthy services
      const mockServices = [
        { host: "host1", port: 8081 },
        { host: "host2", port: 8082 },
        { host: "host3", port: 8083 },
      ];

      loadBalancer.getHealthyServices = jest.fn().mockReturnValue(mockServices);

      // First round
      expect(loadBalancer.getNextService()).toEqual(mockServices[0]);
      expect(loadBalancer.getNextService()).toEqual(mockServices[1]);
      expect(loadBalancer.getNextService()).toEqual(mockServices[2]);

      // Second round should start from beginning
      expect(loadBalancer.getNextService()).toEqual(mockServices[0]);
    });

    test("should handle single service correctly", () => {
      const mockService = { host: "host1", port: 8081 };
      loadBalancer.getHealthyServices = jest
        .fn()
        .mockReturnValue([mockService]);

      // Should always return the same service
      expect(loadBalancer.getNextService()).toEqual(mockService);
      expect(loadBalancer.getNextService()).toEqual(mockService);
    });

    test("should maintain correct index after multiple rounds", () => {
      const mockServices = [
        { host: "host1", port: 8081 },
        { host: "host2", port: 8082 },
      ];

      loadBalancer.getHealthyServices = jest.fn().mockReturnValue(mockServices);

      // Complete first round
      loadBalancer.getNextService();
      loadBalancer.getNextService();

      // Start second round
      expect(loadBalancer.getNextService()).toEqual(mockServices[0]);
      expect(loadBalancer.currentIndex).toBe(1);
    });
  });
});
