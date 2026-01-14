# Cross-Platform Resource Monitors

Platform-specific implementations for system resource monitoring.

## Architecture

```
ResourceMonitor (main)
    ↓
MonitorFactory (platform detection)
    ↓
IPlatformMonitor (interface)
    ↓
┌─────────────┬──────────────┬─────────────────┐
│ DarwinMonitor│ LinuxMonitor │ FallbackMonitor │
│  (macOS)     │  (Linux)     │  (Other)        │
└─────────────┴──────────────┴─────────────────┘
```

## Platform Support

### Darwin (macOS)
- **CPU**: Monitors `kernel_task` process via `ps`
- **Memory**: Uses `vm_stat` and `sysctl hw.memsize`
- **Process Count**: Uses `ps -A`

### Linux
- **CPU**: Monitors kernel threads (kworker, ksoftirqd) via `ps aux`
- **Memory**: Uses `/proc/meminfo` (MemTotal, MemAvailable)
- **Process Count**: Uses `ps aux`

### Fallback (Windows, etc.)
- Returns safe default values
- Allows spawn but with conservative metrics

## Usage

### Automatic Platform Detection

```typescript
import { ResourceMonitor } from '@/sdk/ResourceMonitor';

const monitor = new ResourceMonitor();
const result = await monitor.checkResources();

console.log(`Platform: ${monitor.getPlatformName()}`);
console.log(`Can spawn: ${result.can_spawn_agent}`);
console.log(`Metrics:`, result.metrics);
```

### Custom Platform Monitor (Testing)

```typescript
import { ResourceMonitor } from '@/sdk/ResourceMonitor';
import { DarwinMonitor, LinuxMonitor, FallbackMonitor } from '@/sdk/monitors';

// Force specific platform
const monitor = new ResourceMonitor(new LinuxMonitor());

// Mock monitor for testing
const mockMonitor = {
  getPlatformName: () => 'mock',
  getKernelTaskCPU: async () => 10,
  getMemoryPressure: async () => 20,
  getProcessCount: async () => 100,
};
const testMonitor = new ResourceMonitor(mockMonitor);
```

## Thresholds

Default thresholds (configurable):
- **Kernel CPU**: 50%
- **Memory Pressure**: 80%
- **Process Count**: 400

## Error Handling

All platform monitors return safe defaults on error:
- Kernel CPU: 0 or 30 (depending on failure point)
- Memory Pressure: 50 or 60
- Process Count: 200 or 250

If monitoring fails completely, ResourceMonitor returns default metrics and allows spawn with a warning message.
