#!/usr/bin/env bats

# Setup: Establish the environment before each test
setup() {
    # Ensure we are executing from the project root
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
    
    # Define the project root relative to the test file
    # This mirrors the logic we used to fix main.js
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." >/dev/null 2>&1 && pwd)"
}

@test "Verification: Project Root is correctly identified" {
    # Verify main.js exists at the root
    [ -f "$PROJECT_ROOT/main.js" ]
}

@test "Verification: Environment hydration (.env) is accessible" {
    # Ensure .env exists for EnvironmentService to hydrate
    [ -f "$PROJECT_ROOT/.env" ]
}

@test "Infrastructure: Adapter Manifest exists and is valid JSON" {
    # Verify the pathing we corrected in main.js and AdapterFactory
    MANIFEST_PATH="$PROJECT_ROOT/config/adapters.manifest.json"
    
    run [ -f "$MANIFEST_PATH" ]
    assert_success
    
    # Use jq to verify the JSON structure is parseable
    run jq '.' "$MANIFEST_PATH"
    assert_success
}

@test "End-to-End: System executes in Mock Mode without pathing errors" {
    # This test simulates a user run to catch ENOENT errors in the factory
    # We use the --mock flag to avoid needing real API credentials
    run node "$PROJECT_ROOT/main.js" --mock SPX
    
    # Assert that the process didn't exit with an error code (1)
    assert_success
    
    # Verify that 'Adapter Injection Failure' does not appear in the output
    refute_output --partial "Adapter Injection Failure"
    assert_output --partial "MockMarketAdapter"
}
