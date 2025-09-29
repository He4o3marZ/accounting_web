import { getTranslationMemory } from './translation-memory';
import { createTranslationProvider, TranslationProvider } from './translation-providers';
import { getHTMLTranslator, HTMLTranslator } from './html-translator';

export interface TranslationRequest {
  text: string;
  targetLang: string;
  sourceLang?: string;
  context?: string;
  domain?: string;
  preserveHtml?: boolean;
}

export interface TranslationResponse {
  translatedText: string;
  fromCache: boolean;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export class TranslationService {
  private translationMemory = getTranslationMemory();
  private translationProvider: TranslationProvider;
  private htmlTranslator: HTMLTranslator;

  constructor() {
    this.translationProvider = createTranslationProvider();
    this.htmlTranslator = getHTMLTranslator();
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const {
      text,
      targetLang,
      sourceLang = 'auto',
      context,
      domain,
      preserveHtml = false,
    } = request;

    // Check cache first
    const cacheKey = this.generateCacheKey(text, targetLang, sourceLang, context, domain);
    const cached = await this.translationMemory.get(text, targetLang, sourceLang);
    
    if (cached) {
      return {
        translatedText: cached,
        fromCache: true,
        sourceLang,
        targetLang,
        timestamp: Date.now(),
      };
    }

    // Translate content
    let translatedText: string;

    if (preserveHtml && this.htmlTranslator.isHtml(text)) {
      // HTML-aware translation
      const result = await this.htmlTranslator.translateHtml(text, async (textNode) => {
        return await this.translateTextNode(textNode, targetLang, sourceLang);
      });
      translatedText = result.translatedHtml;
    } else {
      // Plain text translation
      translatedText = await this.translateTextNode(text, targetLang, sourceLang);
    }

    // Cache the result
    await this.translationMemory.set(text, translatedText, targetLang, sourceLang);

    return {
      translatedText,
      fromCache: false,
      sourceLang,
      targetLang,
      timestamp: Date.now(),
    };
  }

  private async translateTextNode(text: string, targetLang: string, sourceLang: string): Promise<string> {
    if (!this.translationProvider.isAvailable()) {
      console.warn('Translation provider not available, returning original text');
      return text;
    }

    try {
      return await this.translationProvider.translate(text, targetLang, sourceLang);
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Fallback to original text
    }
  }

  private generateCacheKey(
    text: string,
    targetLang: string,
    sourceLang: string,
    context?: string,
    domain?: string
  ): string {
    const parts = [sourceLang, targetLang, text];
    if (context) parts.push(context);
    if (domain) parts.push(domain);
    return parts.join('|');
  }

  async translateBatch(requests: TranslationRequest[]): Promise<TranslationResponse[]> {
    const results: TranslationResponse[] = [];
    
    // Process in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(request => this.translate(request))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async clearCache(): Promise<void> {
    await this.translationMemory.clear();
  }

  async getCacheStats(): Promise<{ memoryCacheSize: number; redisConnected: boolean }> {
    return await this.translationMemory.getStats();
  }

  isProviderAvailable(): boolean {
    return this.translationProvider.isAvailable();
  }

  getProviderName(): string {
    return this.translationProvider.constructor.name;
  }
}

// Singleton instance
let translationService: TranslationService | null = null;

export function getTranslationService(): TranslationService {
  if (!translationService) {
    translationService = new TranslationService();
  }
  return translationService;
}








