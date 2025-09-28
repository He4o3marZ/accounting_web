import { FileParser, ParsedTransaction } from '../../types';
import { CSVParser } from './csv-parser';
import { PDFParser } from './pdf-parser';

export class ParserRouter {
  private parsers: FileParser[] = [];

  constructor() {
    this.parsers = [
      new CSVParser(),
      new PDFParser(),
    ];
  }

  async parseFile(buffer: Buffer, filename: string, mimeType: string): Promise<ParsedTransaction[]> {
    // Find appropriate parser
    const parser = this.parsers.find(p => p.canHandle(mimeType));
    
    if (!parser) {
      // If no parser can handle this file type, route to Python worker
      throw new Error(`No parser available for MIME type: ${mimeType}. File will be processed by Python worker.`);
    }

    try {
      return await parser.parse(buffer, filename);
    } catch (error) {
      console.error(`Parser failed for ${mimeType}:`, error);
      // If parsing fails, route to Python worker as fallback
      throw new Error(`Parser failed: ${error instanceof Error ? error.message : 'Unknown error'}. File will be processed by Python worker.`);
    }
  }

  canHandle(mimeType: string): boolean {
    return this.parsers.some(p => p.canHandle(mimeType));
  }

  shouldRouteToPython(mimeType: string): boolean {
    // Route to Python for complex cases
    const imageTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'];
    const complexPdfTypes = ['application/pdf']; // All PDFs go to Python for better parsing
    
    return imageTypes.includes(mimeType) || complexPdfTypes.includes(mimeType);
  }
}

// Singleton instance
let parserRouter: ParserRouter | null = null;

export function getParserRouter(): ParserRouter {
  if (!parserRouter) {
    parserRouter = new ParserRouter();
  }
  return parserRouter;
}

