import { FileParser, ParsedTransaction } from '../../types';
import { parse } from 'csv-parse/sync';

export class CSVParser implements FileParser {
  canHandle(mimeType: string): boolean {
    return mimeType === 'text/csv' || mimeType === 'application/csv';
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedTransaction[]> {
    try {
      const csvText = buffer.toString('utf-8');
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records.map((row: any, index: number) => ({
        id: `csv-${Date.now()}-${index}`,
        date: this.parseDate(row.Date || row.date || new Date().toISOString().split('T')[0]),
        description: row.Description || row.description || 'Transaction',
        vendor: row.Vendor || row.vendor || 'Unknown',
        amount: this.parseAmount(row.Amount || row.amount || 0),
        currency: row.Currency || row.currency || 'EUR',
        category: row.Category || row.category || 'General',
                    taxAmount: (row.TaxAmount || row.taxAmount) ? this.parseAmount(row.TaxAmount || row.taxAmount) : undefined,
        meta: {
          source: 'csv',
          filename,
          rowIndex: index,
        },
      }));
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseDate(dateStr: string): string {
    try {
      // Try to parse various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If parsing fails, return current date
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private parseAmount(amountStr: string | number): number {
    if (typeof amountStr === 'number') return amountStr;
    
    // Remove currency symbols
    let cleaned = amountStr.toString()
      .replace(/[€$£¥]/g, '')
      .trim();
    
    // Handle thousands separators (comma) vs decimal separators
    // If there's a comma followed by exactly 2 digits at the end, it's likely a decimal separator
    if (/,(\d{2})$/.test(cleaned)) {
      // Comma is decimal separator, replace with dot
      cleaned = cleaned.replace(/,(\d{2})$/, '.$1');
    } else {
      // Comma is thousands separator, remove it
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? NaN : parsed;
  }
}
