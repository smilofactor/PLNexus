/**
 * domain/use-cases/GetMarketSnapshot.js
 * * Production-Ready Use Case.
 * This service orchestrates the discovery of market data while maintaining
 * strict domain boundaries. It is designed to be fully traceable.
 */

export class GetMarketSnapshot {
    #marketDataPort;
    #tracer;

    /**
     * @param {Object} marketDataPort - The outbound port implementation (Adapter).
     * @param {Object} tracer - Telemetry utility for execution observability.
     * @throws {Error} If the port is not provided during initialization.
     */
    constructor(marketDataPort, tracer) {
        if (!marketDataPort || !tracer) {
            //throw new Error('[UseCase] GetMarketSnapshot requires a valid MarketDataPort implementation.');
            throw new Error(`[UseCase] Dependency Injection Failed: Port(${!!marketDataPort}) Tracer(${!!tracer})`);
          }
        this.#marketDataPort = marketDataPort;
        this.#tracer = tracer;
    }

    /**
     * Executes the market discovery process.
     * @param {string} symbol - The ticker to look up (e.g., 'SPX', 'ES').
     * @returns {Promise<Object>} The validated MarketQuote entity.
     * @throws {Error} If the symbol fails domain-level validation.
     */
    async execute(symbol) {
        // THE V1 UPDATE: Wrap the entire execution in a traceSpan.
        // This replaces manual start/end timers and manual logger.info calls.
        return await this.#tracer.traceSpan('DOMAIN', 'GET_MARKET_SNAPSHOT', async () => {
            
            // 1. INPUT VALIDATION (Fail-fast)
            // Moved to the top of the span to ensure validation failures are also traceable.
            if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
                throw new Error('Domain Error: A valid market ticker symbol is required.');
            }

            const cleanSymbol = symbol.trim().toUpperCase();

            // 2. ADAPTER ORCHESTRATION
            // The Use Case remains agnostic of the underlying adapter (Mock vs. Finnhub).
            try {
                const quote = await this.#marketDataPort.fetchQuote(cleanSymbol);
                return quote;
            } catch (error) {
                // Wrap errors with domain context while preventing technical leak to UI.
                throw new Error(`Market discovery failed for ${cleanSymbol}. Please check system logs.`);
            }
            
	}, { symbol });

    }
}
