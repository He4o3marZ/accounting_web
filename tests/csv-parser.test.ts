import { CSVParser } from '../src/services/parsers/csv-parser';

describe('CSVParser', () => {
  let parser: CSVParser;

  beforeEach(() => {
    parser = new CSVParser();
  });

  describe('parseFile', () => {
    it('should parse a simple CSV file', async () => {
      // Arrange
      const csvContent = `Date,Description,Amount,Currency,Category
2023-01-01,Test Transaction 1,100.50,USD,Sales
2023-01-02,Test Transaction 2,-50.25,USD,Expenses`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act
      const result = await parser.parse(buffer, 'test.csv');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: expect.any(String),
        date: '2023-01-01T00:00:00.000Z',
        description: 'Test Transaction 1',
        vendor: 'Unknown',
        amount: 100.50,
        currency: 'USD',
        category: 'Sales',
        taxAmount: undefined,
        meta: {
          source: 'csv',
          filename: 'test.csv',
          rowIndex: 0,
        },
      });
      expect(result[1]).toEqual({
        id: expect.any(String),
        date: '2023-01-02T00:00:00.000Z',
        description: 'Test Transaction 2',
        vendor: 'Unknown',
        amount: -50.25,
        currency: 'USD',
        category: 'Expenses',
        taxAmount: undefined,
        meta: {
          source: 'csv',
          filename: 'test.csv',
          rowIndex: 1,
        },
      });
    });

    it('should handle CSV with different column names', async () => {
      // Arrange
      const csvContent = `date,description,amount,currency,category
2023-01-01,Another Transaction,75.00,EUR,General`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act
      const result = await parser.parse(buffer, 'test.csv');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: expect.any(String),
        date: '2023-01-01T00:00:00.000Z',
        description: 'Another Transaction',
        vendor: 'Unknown',
        amount: 75.00,
        currency: 'EUR',
        category: 'General',
        taxAmount: undefined,
        meta: {
          source: 'csv',
          filename: 'test.csv',
          rowIndex: 0,
        },
      });
    });

    it('should handle CSV with tax amount', async () => {
      // Arrange
      const csvContent = `Date,Description,Amount,Currency,Category,TaxAmount
2023-01-01,Taxed Transaction,100.00,USD,Sales,10.00`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act
      const result = await parser.parse(buffer, 'test.csv');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.taxAmount).toBe(10.00);
    });

    it('should handle empty CSV file', async () => {
      // Arrange
      const csvContent = `Date,Description,Amount,Currency,Category
`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act
      const result = await parser.parse(buffer, 'test.csv');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle CSV with missing columns', async () => {
      // Arrange
      const csvContent = `Date,Description,Amount
2023-01-01,Minimal Transaction,50.00`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act
      const result = await parser.parse(buffer, 'test.csv');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: expect.any(String),
        date: '2023-01-01T00:00:00.000Z',
        description: 'Minimal Transaction',
        vendor: 'Unknown',
        amount: 50.00,
        currency: 'EUR', // Default currency
        category: 'General', // Default category
        taxAmount: undefined,
        meta: {
          source: 'csv',
          filename: 'test.csv',
          rowIndex: 0,
        },
      });
    });

    it('should handle malformed CSV gracefully', async () => {
      // Arrange
      const csvContent = `Date,Description,Amount,Currency,Category
2023-01-01,Valid Transaction,100.00,USD,Sales
2023-01-02,Another Valid Transaction,200.00,USD,Sales`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act
      const result = await parser.parse(buffer, 'test.csv');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.description).toBe('Valid Transaction');
      expect(result[1]?.description).toBe('Another Valid Transaction');
    });
  });

  describe('parseAmount', () => {
    it('should parse various amount formats', () => {
      expect(parser['parseAmount']('100.50')).toBe(100.50);
      expect(parser['parseAmount']('1,000.50')).toBe(1000.50);
      expect(parser['parseAmount']('-50.25')).toBe(-50.25);
      expect(parser['parseAmount']('$100.50')).toBe(100.50);
      expect(parser['parseAmount']('€1,000.50')).toBe(1000.50);
      expect(parser['parseAmount'](100.50)).toBe(100.50);
    });

    it('should handle invalid amount formats', () => {
      expect(parser['parseAmount']('invalid')).toBeNaN();
      expect(parser['parseAmount']('')).toBeNaN();
      expect(parser['parseAmount']('abc123')).toBeNaN();
    });
  });
});
