import { FileParser, ParsedTransaction } from '../../types';
import pdfParse from 'pdf-parse';

export class PDFParser implements FileParser {
  canHandle(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedTransaction[]> {
    try {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;
      
      // Simple text-based parsing for PDFs
      // This is a basic implementation - complex PDFs should use Python worker
      const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
      
      const transactions: ParsedTransaction[] = [];
      let transactionIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        // Look for lines that might contain transaction data
        if (this.isTransactionLine(line)) {
          const transaction = this.parseTransactionLine(line, transactionIndex, filename);
          if (transaction) {
            transactions.push(transaction);
            transactionIndex++;
          }
        }
      }

      // If no transactions found, create a single entry for the entire document
      if (transactions.length === 0) {
        transactions.push({
          id: `pdf-${Date.now()}`,
          date: new Date().toISOString(),
          description: `PDF Document: ${filename}`,
          vendor: this.extractVendor(text),
          amount: this.extractTotalAmount(text),
          currency: 'EUR',
          category: 'Document',
          meta: {
            source: 'pdf',
            filename,
            pageCount: pdfData.numpages,
            textLength: text.length,
          },
        });
      }

      return transactions;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isTransactionLine(line: string): boolean {
    // Look for lines that contain numbers (amounts) and text
    const hasAmount = /\d+[.,]\d{2}/.test(line);
    const hasText = /[a-zA-Z]/.test(line);
    const isNotHeader = !line.match(/^(date|description|amount|total|subtotal)/i);
    
    return hasAmount && hasText && isNotHeader && line.length > 10;
  }

  private parseTransactionLine(line: string, index: number, filename: string): ParsedTransaction | null {
    try {
      // Extract amount from line
      const amountMatch = line.match(/(\d+[.,]\d{2})/);
      if (!amountMatch) return null;

      const amount = parseFloat(amountMatch[1]!.replace(',', '.'));
      const description = line.replace(amountMatch[1]!, '').trim();

      return {
        id: `pdf-${Date.now()}-${index}`,
        date: new Date().toISOString(),
        description: description || 'Transaction',
        vendor: 'PDF Document',
        amount,
        currency: 'EUR',
        category: 'General',
        meta: {
          source: 'pdf',
          filename,
          originalLine: line,
        },
      };
    } catch {
      return null;
    }
  }

  private extractVendor(text: string): string {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Look for vendor name in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line && line.length > 10 && 
          !line.match(/^\d+$/) && 
          !line.includes('€') && 
          !line.includes('Phone') && 
          !line.includes('Invoice')) {
        return line;
      }
    }
    
    return 'Unknown Vendor';
  }

  private extractTotalAmount(text: string): number {
    // Look for total amount patterns
    const totalPatterns = [
      /total[:\s]*€?(\d+[.,]\d{2})/i,
      /sum[:\s]*€?(\d+[.,]\d{2})/i,
      /amount[:\s]*€?(\d+[.,]\d{2})/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1]!.replace(',', '.'));
      }
    }

    return 0;
  }
}
