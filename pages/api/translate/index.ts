import { NextApiRequest, NextApiResponse } from 'next';
import { getTranslationService } from '@/lib/translation-service';
import { TranslationRequest } from '@/lib/translation-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLang, sourceLang, context, domain, preserveHtml } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing required fields: text, targetLang' });
    }

    const translationService = getTranslationService();
    
    const request: TranslationRequest = {
      text,
      targetLang,
      sourceLang,
      context,
      domain,
      preserveHtml,
    };

    const result = await translationService.translate(request);

    res.status(200).json(result);
  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}






