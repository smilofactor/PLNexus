/**
 * @fileoverview ConsoleAdapter (Primary Outbound Adapter)
 * Responsible for formatting domain data into a human-readable CLI interface.
 */

export class ConsoleAdapter {
    /**
     * Renders the market data snapshot to the terminal.
     * @param {Object} data - The market data object from the Use Case.
     */
    render(data) {
        // --- 1. DEFENSIVE DATA VALIDATION ---
        // Prevents the "Missing Use Case" style errors by validating input structure.
        if (!data || typeof data !== 'object') {
            console.error("\n[UI ERROR] ConsoleAdapter received null or invalid data.");
            return;
        }

        // --- 2. DATA DESTRUCTURING ---
        const { 
            symbol = 'UNKNOWN', 
            price = 0, 
            change = 0, 
            high = 0, 
            low = 0 
        } = data;

        // --- 3. FORMATTING LOGIC ---
        const timestamp = new Date().toLocaleTimeString();
        const trendIcon = change >= 0 ? '📈' : '📉';
        const colorCode = change >= 0 ? '\x1b[32m' : '\x1b[31m'; // Green or Red
        const resetColor = '\x1b[0m';

        // --- 4. TERMINAL OUTPUT ---
        console.log("\n" + "=".repeat(50));
        console.log(`  PLNexus DISCOVERY: ${symbol.toUpperCase()}  [${timestamp}]`);
        console.log("=".repeat(50));
        
        console.log(`  CURRENT PRICE :  $${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
        console.log(`  24H CHANGE    :  ${colorCode}${change > 0 ? '+' : ''}${change}% ${trendIcon}${resetColor}`);
        
        console.log("-".repeat(50));
        console.log(`  SESSION HIGH  :  $${high.toLocaleString()}`);
        console.log(`  SESSION LOW   :  $${low.toLocaleString()}`);
        console.log("=".repeat(50) + "\n");
    }

    /**
     * Renders an error message in a standardized format.
     * @param {string} message 
     */
    renderError(message) {
        console.error(`\n\x1b[41m ERROR \x1b[0m ${message}\n`);
    }
}
