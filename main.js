/**
 * @fileoverview 
 * PLNexus Market Discovery Tool - Core Orchestrator
 * * This module serves as the 'Composer' within the Hexagonal Architecture. 
 * Its primary responsibilities include:
 * 1. Environment hydration and absolute path resolution.
 * 2. Dependency Injection (DI) via the AdapterFactory.
 * 3. Lifecycle orchestration of domain use cases.
 * 4. Global telemetry initialization (Tracer.js).
 *
 * @version 1.0.0-alpha
 * @license Professional / Internal
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// --- 1. SYSTEM FOUNDATION ---
/**
 * Absolute path resolution ensures global portability. 
 * This prevents pathing failures when the tool is executed from 
 * external directories or CI/CD pipelines.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = __dirname; 

// Load environmental configurations into process.env
dotenv.config({ path: join(PROJECT_ROOT, '.env') });

// --- 2. ARCHITECTURAL LAYER IMPORTS ---
// Cross-Cutting Concerns (Observability)
import { logger } from '#logger';
import { tracer } from '#tracer';

// Domain Layer (Business Logic)
import { GetMarketSnapshot } from './domain/use-cases/GetMarketSnapshot.js';

// Infrastructure Layer (Driving & Outbound Adapters)
import { ConsoleAdapter } from './infrastructure/adapters/cli/ConsoleAdapter.js';
import { EnvironmentService } from './infrastructure/config/EnvironmentService.js';
import { MenuSystem } from './infrastructure/adapters/cli/MenuSystem.js';
import { AdapterFactory } from './infrastructure/factories/AdapterFactory.js';

/**
 * Provides user-facing guidance for CLI-driven execution.
 * Invoked via -h or --help flags.
 */
function displayHelp() {
    console.log(`
PLNEXUS MARKET DISCOVERY TOOL
-----------------------------
USAGE: node main.js [FLAGS] [SYMBOL]

FLAGS:
  -h, --help      Display this guide
  --live          Connect to live market providers (Finnhub)
  --mock          Use local simulated data providers
    `);
    process.exit(0);
}

/**
 * Application Entry Point (Bootstrap)
 * Coordinates the transition from Infrastructure to Domain layers.
 */
async function bootstrap() {
    /** * TRACER INITIALIZATION: Must occur before logic execution to 
     * establish the Session ID (SID) and trace log files.
     */
    await tracer.initialize(PROJECT_ROOT);
    
    // Hydrate system configurations and initialize the primary view
    EnvironmentService.hydrate();
    const consoleView = new ConsoleAdapter();
    
    // Execution Context: State container for input capture
    const context = {
        mode: null,
        symbol: null,
        isAutomated: process.argv.slice(2).length > 0
    };

    // --- 3. INPUT CAPTURE (Driving Adapters) ---
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        displayHelp();
    }

    if (context.isAutomated) {
        // AUTOMATED STRATEGY: Resolves mode and symbol from CLI arguments
        context.mode = args.includes('--mock') ? '2' : (args.includes('--live') ? '1' : null);
        context.symbol = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
    } else {
        // INTERACTIVE STRATEGY: Delegates to the MenuSystem driving adapter
        const menu = new MenuSystem();
        try {
            // Observed Interaction: Captured as a CLI-layer trace span
            const selection = await tracer.traceSpan('CLI', 'USER_INTERACTION', () => menu.getInitialSelection());
            context.mode = selection.mode;
            context.symbol = selection.symbol;
        } catch (error) {
            logger.error("Terminal Menu System failure", { error: error.message });
            process.exit(1);
        } finally {
            menu.close(); // Ensure terminal resources are released
        }
    }

    // --- 4. EXECUTION PHASE (Observed Flow) ---
    /**
     * BOOTSTRAP_SEQUENCE: Tracks the 'Velocity vs. Reliability' of the 
     * adapter loading and use-case execution phases.
     */
    await tracer.traceSpan('SYSTEM', 'BOOTSTRAP_SEQUENCE', async () => {
        
        // ADAPTER INJECTION: Factory resolves the outbound port implementation
        const factory = new AdapterFactory(PROJECT_ROOT);
        const adapter = await factory.loadAdapter(context.mode, EnvironmentService);

        /**
         * DOMAIN ORCHESTRATION:
         * We initialize the Use Case with the selected adapter. 
         * Note: Validation logic and domain-specific tracing now reside 
         * within the GetMarketSnapshot service to maintain boundary integrity.
         */
        const useCase = new GetMarketSnapshot(adapter, tracer);
        const sanitizedSymbol = context.symbol?.toUpperCase() || 'SPX'; 
        
        // Provide immediate narrative feedback to the operator
        logger.info(`Initiating Market Snapshot...`, { symbol: sanitizedSymbol, mode: context.mode });
        
        // Trigger the use case (Passing 'mode' ensures trace context continuity)
        const quote = await useCase.execute(sanitizedSymbol, context.mode);
        
        // Render results via the secondary driving adapter
        consoleView.render(quote);

    }, { mode: context.mode, symbol: context.symbol });
}

// --- 5. GLOBAL LIFECYCLE MANAGEMENT ---
/**
 * SIGNAL HANDLING: Ensures the application exits gracefully on SIGINT (Ctrl+C).
 */
process.on('SIGINT', () => {
    console.log("\n[SIGINT] Terminating PLNexus...");
    process.exit(0);
});

/**
 * ERROR BOUNDARY: Captures unhandled promise rejections to prevent silent failures.
 */
process.on('unhandledRejection', (reason) => {
    logger.error(`Critical Unhandled Rejection: ${reason}`);
    process.exit(1);
});

// Launch the application
bootstrap();
