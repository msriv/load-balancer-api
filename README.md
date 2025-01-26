# CodaPayments Load Balancer

A Node.js-based load balancer implementation with health checking and multiple balancing strategies.

## Features

- Multiple load balancing strategies:
  - Static (Round-robin)
  - LRT (Least Response Time)
- Health checking of backend services
- Automatic failover
- Request retry mechanism
- Comprehensive logging
- Configurable settings
- Load testing support

## Prerequisites

- Node.js (used v22.13.0)
- npm (used v10.9.2)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/CodaPayments.git
cd CodaPayments
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Configuration can be found in `src/config/config.js`. Key configurations include:

- Load balancer type
- Backend services list
- Server settings
- Retry mechanism settings

Environment variables can override default configurations:
- `PORT`: Server port
- `HOST`: Server host
- `LOG_LEVEL`: Logging level
- `LOAD_BALANCER_TYPE`: Type of load balancer ("static" or "lrt")

## Running the Application

1. Make the startup script executable:
```bash
chmod +x startup.sh
```

2. Start the services:
```bash
./startup.sh
```

This will start multiple backend services and the load balancer.

## Testing

### Unit Testing

Run the unit tests using Jest:
```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode (useful during development)
npm test -- --watch

# Run specific test file
npm test -- application.test.js
```

Test files are located in the `__tests__` directory and follow the naming convention `*.test.js`.

Coverage reports can be found in the `coverage` directory after running tests with the --coverage flag.

### Manual Testing

Send a test request:
```bash
curl -X POST http://localhost:5000 \
  -H "Content-Type: application/json" \
  -d '{"game": "Mobile Legends", "gamerID": "GYUTDTE", "points": 20}'
```

### Health Check

```bash
curl http://localhost:5000/healthz
```

### Load Testing

1. Install Artillery globally:
```bash
npm install -g artillery
```

2. Run load tests:
```bash
artillery run tests/load-test-min.yml
```

## Architecture

The application consists of several key components:

- **Application Server**: Main HTTP server handling incoming requests
- **Load Balancer**: Distributes requests across backend services
- **Health Checker**: Monitors backend service health
- **Logger**: Structured logging system using Pino

### Load Balancing Strategies

1. **Static Load Balancer**:
   - Round-robin distribution of requests
   - Simple and predictable

2. **LRT (Least Response Time) Load Balancer**:
   - Routes requests based on service response times
   - Adaptive to performance characteristics

## Error Handling

- Automatic retry mechanism for failed requests
- Circuit breaking for unhealthy services
- Comprehensive error logging
- Graceful shutdown handling

## Logging

The application uses Pino for structured logging with different configurations for development and production environments.

Development logging includes:
- Colorized output
- Human-readable timestamps
- Detailed debug information

Production logging includes:
- JSON formatted logs
- Environment information
- Service identification

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
```

This README provides a comprehensive overview of your project, including installation instructions, features, configuration options, and usage examples. You might want to customize it further based on your specific needs or add more sections as required.
