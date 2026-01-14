# Load Testing Framework

Verifies system behavior under stress with concurrent users. Collects throughput, latency percentiles (p50, p95, p99), and error metrics.

## Features

- **Concurrent User Simulation**: Simulate multiple concurrent users making requests
- **Warm-up Period**: Gradual ramp-up before measurement to stabilize system
- **Latency Percentiles**: Track p50, p95, p99, min, max, and mean latency
- **Throughput Measurement**: Requests per second (RPS) tracking
- **Error Rate Tracking**: Monitor success/failure rates
- **Threshold Validation**: Pass/fail based on configurable thresholds
- **Mock Mode**: Fast synthetic tasks for quick testing

## Usage

### Basic Load Test

```typescript
import { LoadTester } from "./LoadTester.js";

const tester = new LoadTester();
const result = await tester.runTest({
  concurrentUsers: 10,
  duration: 5000, // 5 seconds
  rampUpTime: 1000, // 1 second warm-up
  targetRPS: 50,
  mockMode: true,
});

console.log(`Throughput: ${result.metrics.throughput.toFixed(2)} RPS`);
console.log(`P95 Latency: ${result.metrics.latency.p95.toFixed(2)}ms`);
console.log(`Error Rate: ${(result.metrics.errorRate * 100).toFixed(2)}%`);
console.log(`Test Passed: ${result.metrics.passed}`);
```

### Custom Task Function

```typescript
const customTask = async () => {
  // Your system under test
  await myAPI.processRequest();
};

const tester = new LoadTester(customTask);
const result = await tester.runTest({
  concurrentUsers: 5,
  duration: 10000,
  rampUpTime: 2000,
  targetRPS: 20,
  mockMode: false,
});
```

### With Thresholds

```typescript
const result = await tester.runTest({
  concurrentUsers: 10,
  duration: 5000,
  rampUpTime: 1000,
  targetRPS: 50,
  mockMode: true,
  thresholds: {
    maxP50Latency: 100, // ms
    maxP95Latency: 250, // ms
    maxP99Latency: 500, // ms
    maxErrorRate: 0.01, // 1%
    minThroughput: 40, // RPS
  },
});

if (!result.metrics.passed) {
  console.error("Load test failed:");
  result.metrics.violations.forEach((v) => console.error(`  - ${v}`));
}
```

## Configuration

### LoadTestConfig

| Field            | Type                | Description                                     |
| ---------------- | ------------------- | ----------------------------------------------- |
| concurrentUsers  | number              | Number of concurrent users to simulate          |
| duration         | number              | Total test duration in milliseconds             |
| rampUpTime       | number              | Warm-up time before measurement starts (ms)     |
| targetRPS        | number              | Target requests per second                      |
| thresholds       | object (optional)   | Pass/fail thresholds for metrics                |
| mockMode         | boolean (optional)  | Use fast synthetic tasks (default: false)       |

### Thresholds

| Field           | Type   | Description                            |
| --------------- | ------ | -------------------------------------- |
| maxP50Latency   | number | Maximum acceptable P50 latency (ms)    |
| maxP95Latency   | number | Maximum acceptable P95 latency (ms)    |
| maxP99Latency   | number | Maximum acceptable P99 latency (ms)    |
| maxErrorRate    | number | Maximum acceptable error rate (0-1)    |
| minThroughput   | number | Minimum acceptable throughput (RPS)    |

## Metrics

### LoadTestMetrics

| Field          | Type    | Description                                    |
| -------------- | ------- | ---------------------------------------------- |
| totalRequests  | number  | Total requests executed                        |
| successCount   | number  | Successful requests                            |
| errorCount     | number  | Failed requests                                |
| errorRate      | number  | Error rate (0-1)                               |
| throughput     | number  | Requests per second                            |
| latency        | object  | Latency percentiles (p50, p95, p99, min, max)  |
| actualDuration | number  | Actual test duration in milliseconds           |
| passed         | boolean | Whether test passed all thresholds             |
| violations     | array   | List of threshold violations (empty if passed) |

## Running Tests

### All Tests (May Timeout)

```bash
bun test test/load/load.test.ts
```

**Note**: Running all tests together may cause resource exhaustion. Individual tests are recommended.

### Individual Tests

```bash
# Test specific functionality
bun test test/load/load.test.ts --test-name-pattern "should run load test"
bun test test/load/load.test.ts --test-name-pattern "should execute warm-up"
bun test test/load/load.test.ts --test-name-pattern "should track errors"
```

### Verify Implementation

```bash
# Type checking
bun run typecheck

# All test patterns
for test in "should run load test" "should handle custom" "should execute warm-up" \
            "should skip warm-up" "should calculate latency" "should track errors" \
            "should pass when all" "should fail when error" "should handle zero" \
            "should handle task that never"; do
  bun test test/load/load.test.ts --test-name-pattern "$test"
done
```

## Test Scenarios

The test suite covers:

1. **Basic Load Testing**
   - Synthetic task execution
   - Custom task functions
   - Metrics collection

2. **Warm-up Phase**
   - Gradual ramp-up of users
   - Skipping warm-up (rampUpTime=0)
   - Warm-up metrics tracking

3. **Metrics Collection**
   - Latency percentile calculations
   - Throughput tracking
   - Error rate measurement

4. **Threshold Validation**
   - Pass when thresholds are met
   - Fail when thresholds are exceeded
   - Multiple violation reporting

5. **Edge Cases**
   - Zero duration
   - Tasks that never throw
   - Tasks that always throw
   - High/low concurrency

## Mock Mode

Mock mode uses fast synthetic tasks for quick testing:

- **Latency**: 5-25ms (vs 50-150ms in normal mode)
- **Error Rate**: ~5% (vs ~2% in normal mode)
- **Use Case**: Fast feedback, CI/CD pipelines

```typescript
const result = await tester.runTest({
  concurrentUsers: 10,
  duration: 1000,
  rampUpTime: 0,
  targetRPS: 50,
  mockMode: true, // Fast testing
});
```

## Performance Characteristics

- **Memory Efficient**: Uses Set for active task tracking
- **Rate Limiting**: Respects targetRPS with batch-based delays
- **Gradual Ramp-up**: 5-step warm-up phase to avoid shocking the system
- **Non-blocking**: All tasks execute concurrently

## Known Limitations

1. **Resource Exhaustion**: Running all tests together may exhaust system resources
2. **Test Isolation**: Tests should ideally run individually in CI/CD
3. **Rate Limiting Accuracy**: Target RPS is approximate due to batch-based execution
4. **High Concurrency**: Very high concurrency (100+ users) may require system tuning

## Examples

See `test/load/load.test.ts` for comprehensive examples of:
- Basic load testing
- Custom task functions
- Warm-up configuration
- Threshold validation
- Error handling
- Edge cases

## Architecture

```
LoadTester
  ├── runTest(config)
  │   ├── runWarmUp()          # Gradual ramp-up phase
  │   ├── runMeasurement()     # Full load measurement
  │   └── calculateMetrics()   # Compute final metrics
  │
  ├── executeTask()            # Execute single task with timing
  ├── calculatePercentiles()   # Compute latency percentiles
  └── createSyntheticTask()    # Generate mock tasks
```

## Contributing

When adding new features:
1. Add tests to `load.test.ts`
2. Run typecheck: `bun run typecheck`
3. Test individually: `bun test test/load/load.test.ts --test-name-pattern "your test"`
4. Document new configuration options above
5. Update examples as needed
