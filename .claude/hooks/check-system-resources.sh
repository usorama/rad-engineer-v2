#!/bin/bash
# JIT Resource Check for Quality Gates
# Checks system resources BEFORE spawning heavy processes
# Returns exit code 0 if safe to proceed, 1 if should wait

set -e

# Thresholds (tune based on your machine)
MAX_LOAD_AVG=8.0          # Load average threshold (adjust for core count)
MIN_FREE_MEM_PCT=15       # Minimum free memory percentage
MAX_KERNEL_TASK_CPU=40    # kernel_task CPU threshold (%)
MAX_BUN_PROCESSES=2       # Max concurrent bun processes
MAX_TSC_PROCESSES=1       # Max concurrent tsc processes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[BLOCK]${NC} $1"; }

# Check 1: Load Average
check_load_average() {
    local load_1min
    load_1min=$(sysctl -n vm.loadavg | awk '{print $2}')

    if (( $(echo "$load_1min > $MAX_LOAD_AVG" | bc -l) )); then
        log_fail "Load average too high: $load_1min (max: $MAX_LOAD_AVG)"
        return 1
    fi
    log_info "Load average OK: $load_1min"
    return 0
}

# Check 2: Free Memory
check_free_memory() {
    # Get memory stats using vm_stat (macOS)
    local page_size free_pages total_mem free_pct
    page_size=$(vm_stat | head -1 | awk '{print $8}' | tr -d '.')
    page_size=${page_size:-16384}  # Default 16KB pages on Apple Silicon

    # Parse vm_stat output
    local stats
    stats=$(vm_stat)

    free_pages=$(echo "$stats" | grep "Pages free:" | awk '{print $3}' | tr -d '.')
    local inactive_pages
    inactive_pages=$(echo "$stats" | grep "Pages inactive:" | awk '{print $3}' | tr -d '.')

    # Get total physical memory
    total_mem=$(sysctl -n hw.memsize)

    # Calculate free memory (free + inactive as available)
    local available_mem free_pct
    available_mem=$(( (free_pages + inactive_pages) * page_size ))
    free_pct=$(echo "scale=0; $available_mem * 100 / $total_mem" | bc)

    if (( free_pct < MIN_FREE_MEM_PCT )); then
        log_fail "Free memory too low: ${free_pct}% (min: ${MIN_FREE_MEM_PCT}%)"
        return 1
    fi
    log_info "Free memory OK: ${free_pct}%"
    return 0
}

# Check 3: kernel_task CPU
check_kernel_task() {
    local kernel_cpu
    kernel_cpu=$(ps -Ao %cpu,comm | grep kernel_task | head -1 | awk '{print $1}')
    kernel_cpu=${kernel_cpu:-0}

    if (( $(echo "$kernel_cpu > $MAX_KERNEL_TASK_CPU" | bc -l) )); then
        log_fail "kernel_task CPU too high: ${kernel_cpu}% (max: ${MAX_KERNEL_TASK_CPU}%)"
        return 1
    fi
    log_info "kernel_task CPU OK: ${kernel_cpu}%"
    return 0
}

# Check 4: Concurrent bun processes
check_bun_processes() {
    local bun_count
    bun_count=$(pgrep -f "bun test\|bun run" 2>/dev/null | wc -l | tr -d ' ')
    bun_count=${bun_count:-0}

    if (( bun_count >= MAX_BUN_PROCESSES )); then
        log_fail "Too many bun processes: $bun_count (max: $MAX_BUN_PROCESSES)"
        return 1
    fi
    log_info "Bun processes OK: $bun_count"
    return 0
}

# Check 5: Concurrent tsc processes
check_tsc_processes() {
    local tsc_count
    tsc_count=$(pgrep -f "tsc --noEmit\|tsc " 2>/dev/null | wc -l | tr -d ' ')
    tsc_count=${tsc_count:-0}

    if (( tsc_count >= MAX_TSC_PROCESSES )); then
        log_fail "Too many tsc processes: $tsc_count (max: $MAX_TSC_PROCESSES)"
        return 1
    fi
    log_info "TSC processes OK: $tsc_count"
    return 0
}

# Main: Run all checks
main() {
    echo "=== JIT Resource Check ==="
    local failed=0

    check_load_average || ((failed++))
    check_free_memory || ((failed++))
    check_kernel_task || ((failed++))
    check_bun_processes || ((failed++))
    check_tsc_processes || ((failed++))

    echo "=========================="

    if (( failed > 0 )); then
        log_fail "BLOCKED: $failed check(s) failed. Wait before spawning quality gates."
        exit 1
    else
        log_info "ALL CHECKS PASSED - Safe to run quality gates"
        exit 0
    fi
}

# Run if executed directly
main "$@"
