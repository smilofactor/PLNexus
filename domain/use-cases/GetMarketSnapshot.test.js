import { describe, it, expect, vi } from 'vitest';
import { GetMarketSnapshot } from './GetMarketSnapshot.js';
import { MarketQuote } from '../entities/MarketQuote.js';

describe('GetMarketSnapshot Use Case', () => {
    it('should successfully return a MarketQuote when the port provides data', async () => {
        // Create a Mock Port
        const mockPort = {
            fetchQuote: vi.fn().mockResolvedValue(new MarketQuote({
                symbol: 'SPX',
                price: 6800,
                timestamp: Date.now(),
                source: 'Test'
            }))
        };

        const useCase = new GetMarketSnapshot(mockPort);
        const result = await useCase.execute('SPX');

        expect(result.symbol).toBe('SPX');
        expect(result.price).toBe(6800);
        expect(mockPort.fetchQuote).toHaveBeenCalledWith('SPX');
    });

    it('should throw an error if the symbol is invalid', async () => {
        const useCase = new GetMarketSnapshot({});
        await expect(useCase.execute(null)).rejects.toThrow('A valid ticker symbol string is required.');
    });
});
