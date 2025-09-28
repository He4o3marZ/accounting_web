import { NextApiRequest, NextApiResponse } from 'next';
import { getTranslationService } from '@/lib/translation-service';
import { TranslationRequest } from '@/lib/translation-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid requests array' });
    }

    const translationService = getTranslationService();
    const results = await translationService.translateBatch(requests);

    res.status(200).json({ results });
  } catch (error) {
    console.error('Batch translation API error:', error);
    res.status(500).json({ 
      error: 'Batch translation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}






