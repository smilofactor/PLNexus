#!/usr/bin/env bats

# Setup: Ensure we are in the project root
setup() {
    export LOG_LEVEL="info"
    export ENABLE_TRACING="true"
}

# 1. TEST: THE "ALREADY DECLARED" / DI HANDSHAKE
@test "Use Case should throw specific DI error if Tracer is missing" {
    # We simulate a bad initialization to catch the error message we defined in the constructor
    run node -e "import { GetMarketSnapshot } from './domain/use-cases/GetMarketSnapshot.js'; new GetMarketSnapshot({}, null);"
    [[ "$output" =~ "Dependency Injection Failed: Port(true) Tracer(false)" ]]
}

# 2. TEST: THE "UTC VS LOCAL" DATE ISSUE
@test "Tracer should use Local Date (en-CA) not UTC for filenames" {
    # If the system uses toISOString(), this will fail at night (EST)
    LOCAL_DATE=$(date +%Y-%m-%d)
    run node -e "import { tracer } from './shared/Tracer.js'; await tracer.initialize('.'); console.log(tracer.traceFile);"
    [[ "$output" =~ "$LOCAL_DATE" ]]
}

# 3. TEST: THE "CONSOLE BLEED" SELF-CONTAINED CHECK
@test "Tracer record() should NOT use console.error on failure" {
    # We trigger a failure by setting an invalid path
    # We check that stdout/stderr does not contain '[Tracer Error]'
    run node -e "import { tracer } from './shared/Tracer.js'; tracer.traceFile = '/root/forbidden.log'; await tracer.record('SYSTEM', 'TEST');"
    [[ ! "$output" =~ "[Tracer Error]" ]]
}

# 4. TEST: THE "LOG LEVEL" METADATA RESPECT
@test "Tracer should ignore 'debug' spans when LOG_LEVEL is 'info'" {
    export LOG_LEVEL="info"
    # Execute GetMarketSnapshot which sends 'debug' level metadata
    run node main.js --symbol=SPX
    # Verify the .trace.log does NOT contain the debug entry if filtered correctly
    TRACELOG=$(ls logs/traces/*.trace.log | tail -n 1)
    run grep "debug" "$TRACELOG"
    [ "$status" -ne 0 ]
}
