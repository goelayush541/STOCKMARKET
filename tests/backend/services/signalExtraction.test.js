const SignalExtractionService = require('../../../backend/src/services/signalExtraction');
const MarketData = require('../../../backend/src/models/MarketData');
const NewsData = require('../../../backend/src/models/NewsData');

jest.mock('../../../backend/src/models/MarketData');
jest.mock('../../../backend/src/models/NewsData');

describe('SignalExtractionService', () => {
  let signalService;

  beforeEach(() => {
    signalService = new SignalExtractionService();
  });

  describe('extractSignalsFromNews', () => {
    it('should create signals from news with strong sentiment', async () => {
      // Mock data setup
      const mockNews = [{
        _id: 'news1',
        title: 'Apple announces record earnings',
        content: 'AAPL reported exceptional quarterly results',
        sentimentScore: 0.85,
        sentimentLabel: 'positive',
        publishedAt: new Date()
      }];

      const mockMarketData = [{
        symbol: 'AAPL',
        timestamp: new Date(),
        close: 150.25,
        volume: 1000000
      }];

      NewsData.find.mockResolvedValue(mockNews);
      MarketData.find.mockResolvedValue(mockMarketData);

      const result = await signalService.extractSignalsFromNews();

      expect(result.success).toBe(true);
      expect(result.signals).toBeGreaterThan(0);
    });

    it('should not create signals for low confidence news', async () => {
      const mockNews = [{
        _id: 'news2',
        title: 'Market fluctuations continue',
        content: 'The market experienced normal fluctuations today',
        sentimentScore: 0.45, // Below threshold
        sentimentLabel: 'neutral',
        publishedAt: new Date()
      }];

      NewsData.find.mockResolvedValue(mockNews);

      const result = await signalService.extractSignalsFromNews();

      expect(result.signals).toBe(0);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly for bullish trend', () => {
      const mockData = [];
      // Create mock data with consistent gains
      for (let i = 0; i < 15; i++) {
        mockData.push({ close: 100 + i * 2 });
      }

      const rsi = signalService.calculateRSI(mockData);
      expect(rsi).toBeGreaterThan(70); // Should be overbought
    });

    it('should calculate RSI correctly for bearish trend', () => {
      const mockData = [];
      // Create mock data with consistent losses
      for (let i = 0; i < 15; i++) {
        mockData.push({ close: 100 - i * 2 });
      }

      const rsi = signalService.calculateRSI(mockData);
      expect(rsi).toBeLessThan(30); // Should be oversold
    });
  });
});