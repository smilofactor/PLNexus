/**
 * infrastructure/adapters/api/MockMarketAdapter.js
 * * Production-Ready Mock Adapter.
 * This simulates real-world API behavior including network latency,
 * randomized market fluctuations, and occasional connection failures.
 */

import { MarketDataPort } from '../../../domain/ports/outbound/MarketDataPort.js';
import { MarketQuote } from '../../../domain/entities/MarketQuote.js';
import { logger } from '../../../shared/logger.js';

export class MockMarketAdapter extends MarketDataPort {
    /**
     * @param {Object} config - Configuration for the mock behavior.
     * @param {number} config.failureRate - Percentage (0-1) of simulated failures.
     * @param {number} config.maxLatency - Max millisecond delay to simulate.
     */
    constructor({ failureRate = 0.05, maxLatency = 500 } = {}) {
        super();
        this.failureRate = failureRate;
        this.maxLatency = maxLatency;
    }

    /**
     * Fetches a mock quote with simulated real-world conditions.
     * @param {string} symbol - The ticker to fetch.
     * @returns {Promise<MarketQuote>}
     */
    async fetchQuote(symbol) {
        const startTime = Date.now();

        // 1. SIMULATE NETWORK LATENCY
        const latency = Math.floor(Math.random() * this.maxLatency);
        await new Promise(resolve => setTimeout(resolve, latency));

        // 2. SIMULATE RANDOM UPSTREAM FAILURE (Troubleshooting Test)
        if (Math.random() < this.failureRate) {
            logger.error(`[MockAdapter] Simulated Upstream Failure for ${symbol}`, {
                latency,
                errorContext: 'UPSTREAM_TIMEOUT'
            });
            throw new Error('Upstream Market Provider is currently unreachable.');
        }

        // 3. GENERATE DYNAMIC MOCK DATA
        // Simulates slight volatility around the established SPX/ES levels
        const basePrice = symbol.toUpperCase() === 'SPX' ? 6834.50 : 6887.25;
        const drift = (Math.random() - 0.5) * 2.0; // Random movement +/- $1.00
        const finalPrice = parseFloat((basePrice + drift).toFixed(2));

        logger.debug(`[MockAdapter] Successfully simulated data for ${symbol}`, {
            latency: `${latency}ms`,
            price: finalPrice
        });

        return new MarketQuote({
            symbol: symbol.toUpperCase(),
            price: finalPrice,
            timestamp: Date.now(),
            source: 'MockProvider_v2'
        });
    }
}
