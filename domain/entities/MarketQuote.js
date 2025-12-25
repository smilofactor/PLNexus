/**
 * domain/entities/MarketQuote.js
 * * Production-Ready Domain Entity.
 * Represents a single, immutable snapshot of market data.
 * This is the 'Universal Language' used by all Use Cases and Adapters.
 */

export class MarketQuote {
    /**
     * @param {Object} params
     * @param {string} params.symbol - Ticker symbol (e.g., 'SPX')
     * @param {number} params.price - Current market price
     * @param {number} params.timestamp - Unix timestamp (ms) of the quote
     * @param {string} params.source - The name of the adapter that provided the data
     */
    constructor({ symbol, price, timestamp, source }) {
        // 1. DATA VALIDATION (The Entity defends itself)
        if (!symbol || typeof symbol !== 'string') {
            throw new Error('[Entity] MarketQuote requires a valid string symbol.');
        }
        if (typeof price !== 'number' || price < 0) {
            throw new Error(`[Entity] MarketQuote for ${symbol} has an invalid price: ${price}`);
        }
        if (!timestamp || typeof timestamp !== 'number') {
            throw new Error(`[Entity] MarketQuote for ${symbol} requires a valid numerical timestamp.`);
        }

        this.symbol = symbol.toUpperCase();
        this.price = price;
        this.timestamp = timestamp;
        this.source = source || 'UNKNOWN';

        // 2. IMMUTABILITY
        // In production, Domain Entities should not be changed once created.
        // If the price changes, a NEW MarketQuote should be instantiated.
        Object.freeze(this);
    }

    /**
     * Helper to determine the age of the data in milliseconds.
     * Useful for troubleshooting 'stale' market data.
     * @returns {number}
     */
    getAge() {
        return Date.now() - this.timestamp;
    }

    /**
     * Formats the entity for logging or drafting.
     * @returns {Object}
     */
    toJSON() {
        return {
            symbol: this.symbol,
            price: this.price,
            capturedAt: new Date(this.timestamp).toISOString(),
            source: this.source,
            isStale: this.getAge() > 60000 // Flag data older than 1 minute
        };
    }
}
