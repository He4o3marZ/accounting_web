export interface TranslationProvider {
  translate(text: string, targetLang: string, sourceLang?: string): Promise<string>;
  isAvailable(): boolean;
}

export interface TranslationOptions {
  preserveFormatting?: boolean;
  context?: string;
  domain?: string;
}

// Stub provider for development
export class StubTranslationProvider implements TranslationProvider {
  isAvailable(): boolean {
    return true;
  }

  async translate(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (targetLang === 'ar') {
      return `[AR] ${text}`;
    }
    return `[EN] ${text}`;
  }
}

// OpenAI provider
export class OpenAITranslationProvider implements TranslationProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async translate(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not provided');
    }

    const languageNames = {
      en: 'English',
      ar: 'Arabic',
    };

    const targetLanguage = languageNames[targetLang as keyof typeof languageNames] || targetLang;
    const sourceLanguage = sourceLang === 'auto' ? 'auto-detect' : languageNames[sourceLang as keyof typeof languageNames] || sourceLang;

    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
    Preserve any HTML tags and formatting. Only return the translated text, no explanations:

    ${text}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate text accurately while preserving HTML formatting and structure.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      console.error('OpenAI translation error:', error);
      throw error;
    }
  }
}

// Google Translate provider (example)
export class GoogleTranslationProvider implements TranslationProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async translate(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Google Translate API key not provided');
    }

    // Implementation would go here
    // This is a placeholder
    throw new Error('Google Translate provider not implemented');
  }
}

// Provider factory
export function createTranslationProvider(): TranslationProvider {
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (openaiKey) {
    return new OpenAITranslationProvider(openaiKey);
  }

  if (googleKey) {
    return new GoogleTranslationProvider(googleKey);
  }

  // Fallback to stub provider
  return new StubTranslationProvider();
}








