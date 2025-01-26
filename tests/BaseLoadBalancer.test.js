import { BaseLoadBalancer } from "../src/load-balancer/BaseLoadBalancer";

describe("BaseLoadBalancer", () => {
  let loadBalancer;
  let mockLogger;

  // Mock the global fetch
  global.fetch = jest.fn();

  // Mock setInterval properly
  beforeAll(() => {
    jest.useFakeTimers();
    // Properly spy on setInterval
    jest.spyOn(global, "setInterval");
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };

    loadBalancer = new BaseLoadBalancer(mockLogger);
  });

  describe("constructor", () => {
    it("should initialize with empty services array and start health checks", () => {
      expect(loadBalancer.services).toEqual([]);
      expect(loadBalancer.logger).toBe(mockLogger);
      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5000,
      );
    });
  });

  describe("deregisterService", () => {
    it("should remove service from services array", () => {
      // Mock createServiceEntry for this test
      loadBalancer.createServiceEntry = jest
        .fn()
        .mockImplementation((host, port) => ({
          host,
          port,
          healthy: true,
        }));

      // Register services
      loadBalancer.registerService("host1", 8080);
      loadBalancer.registerService("host2", 8081);

      expect(loadBalancer.services.length).toBe(2); // Verify initial state

      // Deregister service
      loadBalancer.deregisterService("host1", 8080);

      expect(loadBalancer.services.length).toBe(1);
      expect(loadBalancer.services[0].host).toBe("host2");
      expect(loadBalancer.services[0].port).toBe(8081);
    });
  });

  describe("registerService", () => {
    it("should throw error when host or port is missing", () => {
      expect(() => loadBalancer.registerService()).toThrow(
        "Host and port are required",
      );
      expect(() => loadBalancer.registerService("host")).toThrow(
        "Host and port are required",
      );
    });

    it("should throw error when host or port is invalid type", () => {
      expect(() => loadBalancer.registerService(123, "8080")).toThrow(
        "Invalid host or port format",
      );
      expect(() => loadBalancer.registerService("host", "8080")).toThrow(
        "Invalid host or port format",
      );
    });

    it("should throw error when createServiceEntry is not implemented", () => {
      expect(() => loadBalancer.registerService("host", 8080)).toThrow(
        "createServiceEntry must be implemented by child class",
      );
    });

    it("should not register duplicate service", () => {
      loadBalancer.createServiceEntry = jest
        .fn()
        .mockImplementation((host, port) => ({
          host,
          port,
          healthy: true,
        }));

      loadBalancer.registerService("host1", 8080);
      loadBalancer.registerService("host1", 8080);

      expect(loadBalancer.services.length).toBe(1);
    });
  });

  describe("checkServicesHealth", () => {
    beforeEach(() => {
      loadBalancer.createServiceEntry = jest
        .fn()
        .mockImplementation((host, port) => ({
          host,
          port,
          healthy: true,
        }));
    });

    it("should mark service as healthy when health check succeeds", async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      loadBalancer.registerService("host1", 8080);
      await loadBalancer.checkServicesHealth();

      expect(loadBalancer.services[0].healthy).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "http://host1:8080/healthz",
        expect.any(Object),
      );
    });

    it("should mark service as unhealthy when health check fails", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Connection failed"));

      loadBalancer.registerService("host1", 8080);
      await loadBalancer.checkServicesHealth();

      expect(loadBalancer.services[0].healthy).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe("getHealthyServices", () => {
    it("should return only healthy services", () => {
      loadBalancer.services = [
        { host: "host1", port: 8080, healthy: true },
        { host: "host2", port: 8081, healthy: false },
        { host: "host3", port: 8082, healthy: true },
      ];

      const healthyServices = loadBalancer.getHealthyServices();
      expect(healthyServices.length).toBe(2);
      expect(healthyServices.every((service) => service.healthy)).toBe(true);
    });
  });

  describe("abstract methods", () => {
    it("should throw error when getNextService is called", () => {
      expect(() => loadBalancer.getNextService()).toThrow(
        "getNextService must be implemented by child class",
      );
    });
  });

  // Test interval cleanup
  afterAll(() => {
    jest.useRealTimers();
  });
});
