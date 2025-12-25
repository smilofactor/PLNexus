#!/usr/bin/env bats

# ==============================================================================
# TDD SUITE: PLNexus Discovery & Tracing Evolution
# This suite tracks the journey from architectural failure to "Main-Worthy" V1.
# ==============================================================================

setup() {
    # Ensure a clean environment for each test
    export ENABLE_TRACING="true"
    export LOG_LEVEL="info"
    # Create logs directory if it doesn't exist for test isolation
    mkdir -p logs/traces
}

# ------------------------------------------------------------------------------
# PHASE 1: DEPENDENCY INJECTION & FAIL-FAST LOGIC
# Target: GetMarketSnapshot.js Constructor
# ------------------------------------------------------------------------------

@test "PHASE 1: Constructor must fail if dependencies are missing (DI Guard)" {
    # This test ensures we don't have 'undefined' errors later in the execution.
    run node -e "import { GetMarketSnapshot } from './domain/use-cases/GetMarketSnapshot.js'; new GetMarketSnapshot(null, null);"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Dependency Injection Failed" ]] 
}

@test "PHASE 1: Constructor must accept valid Port and Tracer" {
    # Validates the successful handshake required for V1.
    run node -e "import { GetMarketSnapshot } from './domain/use-cases/GetMarketSnapshot.js'; new GetMarketSnapshot({}, {});"
    [ "$status" -eq 0 ]
}

# ------------------------------------------------------------------------------
# PHASE 2: TEMPORAL INTEGRITY (UTC vs LOCAL)
# Target: Tracer.js Initialization
# ------------------------------------------------------------------------------

@test "PHASE 2: Tracer filename must use Local Date (en-CA) to prevent UTC rollover" {
    # Prevents the 'Dec 23rd' jump encountered at 8:00 PM EST.
    LOCAL_DATE=$(date +%Y-%m-%d)
    run node -e "import { tracer } from './shared/Tracer.js'; await tracer.initialize(process.cwd()); console.log(tracer.traceFile);"
    [[ "$output" =~ "plnexus-$LOCAL_DATE.trace.log" ]] 
}

# ------------------------------------------------------------------------------
# PHASE 3: OBSERVABILITY & LEAK PREVENTION
# Target: Tracer.js record() Method
# ------------------------------------------------------------------------------

@test "PHASE 3: Tracer must not bleed [Tracer Error] to stdout/stderr on write failure" {
    # Verifies that we replaced console.error with a silent logger.
    # We trigger a failure by pointing to a directory we can't write to.
    run node -e "import { tracer } from './shared/Tracer.js'; tracer.traceFile = '/root/access_denied.log'; await tracer.record('SYSTEM', 'SILENT_TEST');"
    [[ ! "$output" =~ "[Tracer Error]" ]] 
}

@test "PHASE 3: traceSpan must capture start, end, and duration metadata" {
    # Ensures the Higher-Order Function is working as intended in GetMarketSnapshot.
    run node -e "import { tracer } from './shared/Tracer.js'; await tracer.initialize(process.cwd()); await tracer.traceSpan('TEST', 'OP', () => { return true; });"
    TRACELOG=$(ls logs/traces/*.trace.log | tail -n 1)
    run grep "OP_COMPLETE" "$TRACELOG"
    [[ "$output" =~ "durationMs" ]] [cite: 2, 4]
}

# ------------------------------------------------------------------------------
# PHASE 4: LOG LEVEL HIERARCHY & METADATA RESPECT
# Target: Tracer.js Priority Filtering
# ------------------------------------------------------------------------------

@test "PHASE 4: Tracer must ignore 'debug' spans when system LOG_LEVEL is 'info'" {
    export LOG_LEVEL="info"
    # We simulate GetMarketSnapshot sending a debug-level span
    run node -e "import { tracer } from './shared/Tracer.js'; await tracer.initialize(process.cwd()); await tracer.record('DOMAIN', 'DEBUG_EVENT', { level: 'debug' });"
    TRACELOG=$(ls logs/traces/*.trace.log | tail -n 1)
    run grep "DEBUG_EVENT" "$TRACELOG"
    [ "$status" -ne 0 ] # Should NOT find the event
}

@test "PHASE 4: Tracer must record 'debug' spans when system LOG_LEVEL is 'debug'" {
    export LOG_LEVEL="debug"
    run node -e "import { tracer } from './shared/Tracer.js'; await tracer.initialize(process.cwd()); await tracer.record('DOMAIN', 'DEBUG_EVENT', { level: 'debug' });"
    TRACELOG=$(ls logs/traces/*.trace.log | tail -n 1)
    run grep "DEBUG_EVENT" "$TRACELOG"
    [ "$status" -eq 0 ] # Should find the event
}

# ------------------------------------------------------------------------------
# PHASE 5: INTEGRATION (MAIN-WORTHY CHECK)
# Target: Use Case + Tracer Interaction
# ------------------------------------------------------------------------------

@test "PHASE 5: GetMarketSnapshot.execute should successfully generate trace spans" {
    # Full integration test of the current "Main-Worthy" state.
    run node -e "import { GetMarketSnapshot } from './domain/use-cases/GetMarketSnapshot.js'; import { tracer } from './shared/Tracer.js'; await tracer.initialize(process.cwd()); const uc = new GetMarketSnapshot({ fetchQuote: () => ({}) }, tracer); await uc.execute('SPX');"
    TRACELOG=$(ls logs/traces/*.trace.log | tail -n 1)
    run grep "GET_MARKET_SNAPSHOT_START" "$TRACELOG"
    [ "$status" -eq 0 ] [cite: 1, 4]
}
