import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

export interface TranslationOptions {
  preserveHtml?: boolean;
  context?: string;
  domain?: string;
}

export interface TranslationResult {
  translatedText: string;
  fromCache: boolean;
  loading: boolean;
  error: string | null;
}

export function useTranslation() {
  const router = useRouter();
  const { locale } = router;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (
    text: string,
    targetLang?: string,
    options: TranslationOptions = {}
  ): Promise<TranslationResult> => {
    const target = targetLang || locale || 'en';
    
    if (target === 'en' || !text.trim()) {
      return {
        translatedText: text,
        fromCache: true,
        loading: false,
        error: null,
      };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLang: target,
          sourceLang: 'auto',
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        translatedText: result.translatedText,
        fromCache: result.fromCache,
        loading: false,
        error: null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      
      return {
        translatedText: text, // Fallback to original text
        fromCache: false,
        loading: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [locale]);

  const translateBatch = useCallback(async (
    texts: string[],
    targetLang?: string,
    options: TranslationOptions = {}
  ): Promise<TranslationResult[]> => {
    const target = targetLang || locale || 'en';
    
    if (target === 'en') {
      return texts.map(text => ({
        translatedText: text,
        fromCache: true,
        loading: false,
        error: null,
      }));
    }

    setLoading(true);
    setError(null);

    try {
      const requests = texts.map(text => ({
        text,
        targetLang: target,
        sourceLang: 'auto',
        ...options,
      }));

      const response = await fetch('/api/translate/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`Batch translation failed: ${response.status}`);
      }

      const result = await response.json();
      
      return result.results.map((r: any) => ({
        translatedText: r.translatedText,
        fromCache: r.fromCache,
        loading: false,
        error: null,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch translation failed';
      setError(errorMessage);
      
      return texts.map(text => ({
        translatedText: text, // Fallback to original text
        fromCache: false,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  return {
    translate,
    translateBatch,
    loading,
    error,
    locale,
  };
}






