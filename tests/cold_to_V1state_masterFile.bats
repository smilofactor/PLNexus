#!/usr/bin/env bats

# ==============================================================================
# PLNEXUS V1 MASTER SUITE: FROM ZERO TO TREE OF TRUTH
# Targets: Environment Setup, Dependency Integrity, and Architectural Guards
# ==============================================================================

setup() {
    export PROJECT_ROOT="$(pwd)"
    export LOG_LEVEL="debug"
    export ENABLE_TRACING="true"
}

# ------------------------------------------------------------------------------
# PHASE 1: THE FOUNDATION (setup_project.sh & Structure)
# ------------------------------------------------------------------------------

@test "PHASE 1: setup_project.sh must exist and be executable" {
    [ -x "./setup_project.sh" ]
}

@test "PHASE 1: Project tree must contain essential Hexagonal directories" {
    # The Tree of Truth requires specific architectural boundaries
    [ -d "domain/use-cases" ]
    [ -d "infrastructure/config" ]
    [ -d "shared" ]
    [ -d "logs/traces" ]
}

# Add this to PHASE 1 of v1_master.bats
@test "PHASE 1: .env permissions must be strictly 444 (Read-Only)" {
    # Get the octal permissions of the .env file
    PERMS=$(stat -c "%a" .env)
    [ "$PERMS" -eq 444 ]
}

# ------------------------------------------------------------------------------
# PHASE 2: DEPENDENCY POPULATION (package.json & node_modules)
# ------------------------------------------------------------------------------

@test "PHASE 2: package.json must contain required V1 engines and imports" {
    run grep "\"type\": \"module\"" package.json
    [ "$status" -eq 0 ]
    
    # Ensure the logger alias (#logger) is defined for the Tracer fallback [cite: 1]
    run grep "\"#logger\":" package.json
    [ "$status" -eq 0 ]
}

@test "PHASE 2: node_modules must be populated with production dependencies" {
    # Verify that setup_project.sh actually ran npm install
    [ -d "node_modules/dotenv" ]
    [ -d "node_modules/bats" ]
}

# ------------------------------------------------------------------------------
# PHASE 3: THE TRACER LOGIC (Correcting the UTC & Bleed Issues)
# ------------------------------------------------------------------------------

@test "PHASE 3: Tracer must use Local Date (en-CA) for filenames [cite: 1]" {
    # Fixes the Dec 23rd rollover issue found in plnexus-2025-12-22.trace.log [cite: 3]
    LOCAL_DATE=$(date +%Y-%m-%d)
    run node -e "import { tracer } from './shared/Tracer.js'; await tracer.initialize(process.cwd()); console.log(tracer.traceFile);"
    [[ "$output" =~ "plnexus-$LOCAL_DATE.trace.log" ]]
}

@test "PHASE 3: Tracer record() must fail silently without console bleed [cite: 1]" {
    # Ensures Tracer.js record() catch block no longer uses console.error [cite: 1]
    run node -e "import { tracer } from './shared/Tracer.js'; tracer.traceFile = '/dev/null/fake.log'; await tracer.record('SYSTEM', 'FAIL_TEST');"
    [[ ! "$output" =~ "[Tracer Error]" ]]
}

# ------------------------------------------------------------------------------
# PHASE 4: ARCHITECTURAL GUARDS (The DI Handshake)
# ------------------------------------------------------------------------------

@test "PHASE 4: GetMarketSnapshot must fail if Tracer is not injected [cite: 2]" {
    # Validates the fix for the 'traceSpan of undefined' error [cite: 2]
    run node -e "import { GetMarketSnapshot } from './domain/use-cases/GetMarketSnapshot.js'; new GetMarketSnapshot({}, null);"
    [[ "$output" =~ "Dependency Injection Failed" ]]
}

# ------------------------------------------------------------------------------
# PHASE 5: V1 FINAL VERIFICATION (The Tree of Truth Moment)
# ------------------------------------------------------------------------------

@test "PHASE 5: Full execution must generate localized trace with metadata [cite: 3]" {
    # Final check: Does a run for 'LOW' produce a local log with 'debug' metadata? [cite: 3]
    run node main.js --symbol=LOW --mode=1
    
    TRACELOG=$(ls logs/traces/*.trace.log | tail -n 1)
    # Check for the local timestamp format fix
    run grep "GET_MARKET_SNAPSHOT_COMPLETE" "$TRACELOG"
    [ "$status" -eq 0 ]
    
    # Verify metadata capture (symbol, level) [cite: 3]
    run grep "\"symbol\":\"LOW\"" "$TRACELOG"
    [ "$status" -eq 0 ]
}
