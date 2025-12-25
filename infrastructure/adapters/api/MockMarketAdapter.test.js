import { describe, it, expect } from 'vitest';
import { MockMarketAdapter } from './MockMarketAdapter.js';
import { MarketQuote } from '../../../domain/entities/MarketQuote.js';

describe('Market Adapter Integration', () => {
    it('should transform raw provider data into a MarketQuote entity', async () => {
        const adapter = new MockMarketAdapter({ failureRate: 0 }); // Ensure success
        const result = await adapter.fetchQuote('SPX');

        expect(result).toBeInstanceOf(MarketQuote);
        expect(result.source).toContain('MockProvider');
    });
});
