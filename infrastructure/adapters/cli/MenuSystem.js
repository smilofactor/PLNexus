/**
 * @fileoverview MenuSystem.js
 * Sophisticated CLI Interface for the PLNexus Market Discovery System.
 * * DESIGN PRINCIPLES:
 * - Decoupling: Encapsulates all terminal-specific interaction.
 * - Robustness: Handles malformed input and unexpected interruptions.
 * - GUI Readiness: Returns a clean 'SelectionState' object for the orchestrator.
 */

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

export class MenuSystem {
    /**
     * Initializes the interactive terminal interface.
     */
    constructor() {
        this.rl = readline.createInterface({ 
            input, 
            output,
            terminal: true 
        });
    }

    /**
     * Orchestrates the primary user configuration flow.
     * @returns {Promise<{mode: string, symbol: string}>} The sanitized user selection.
     */
    async getInitialSelection() {
        try {
            this.displayHeader();
            
            const mode = await this.promptMode();
            const symbol = await this.promptSymbol();

            return {
                mode,
                symbol: this.sanitizeSymbol(symbol)
            };
        } catch (error) {
            // Catching unexpected input errors to prevent main process hang
            throw new Error(`Menu Interaction Failed: ${error.message}`);
        }
    }

    /**
     * Renders a sophisticated visual header.
     * Use of ASCII framing creates a "Release Quality" feel.
     */
    displayHeader() {
        console.clear();
        console.log("\x1b[36m%s\x1b[0m", "╔══════════════════════════════════════════╗");
        console.log("\x1b[36m%s\x1b[0m", "║    PLNexus MARKET DISCOVERY SYSTEM       ║");
        console.log("\x1b[36m%s\x1b[0m", "║    Professional Baseline v1.0.0          ║");
        console.log("\x1b[36m%s\x1b[0m", "╚══════════════════════════════════════════╝");
    }

    /**
     * Handles Execution Mode selection with validation.
     * @private
     */
    async promptMode() {
        console.log("\n[1] \x1b[32mLIVE MODE\x1b[0m (Real-time API Connection)");
        console.log("[2] \x1b[33mMOCK MODE\x1b[0m (Local Simulator / Sandbox)");
        console.log("[Q] \x1b[31mEXIT\x1b[0m");

        const answer = await this.rl.question("\nSelect Execution Mode: ");
        const sanitized = answer.trim().toUpperCase();

        if (sanitized === 'Q') {
            console.log("Terminating session...");
            process.exit(0);
        }

        if (!['1', '2'].includes(sanitized)) {
            console.log("\x1b[31mInvalid selection. Defaulting to Mock Mode (2).\x1b[0m");
            return '2';
        }

        return sanitized;
    }

    /**
     * Handles Ticker Symbol input.
     * @private
     */
    async promptSymbol() {
        const answer = await this.rl.question("Enter Ticker Symbol (e.g., SPX): ");
        return answer.trim();
    }

    /**
     * Sanitizes ticker input to ensure stability.
     * @param {string} input 
     * @returns {string} Cleaned symbol or default.
     */
    sanitizeSymbol(input) {
        // Enforce the 'Pristine State' default for Mock Mode
        if (!input || input === "") return "SPX";
        
        // Remove accidental flag prefixes if the user types '--BTC'
        return input.replace(/^-+/, '').toUpperCase();
    }

    /**
     * Gracefully closes the interface.
     */
    close() {
        if (this.rl) {
            this.rl.close();
        }
    }
}
