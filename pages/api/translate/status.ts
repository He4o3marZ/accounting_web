import { NextApiRequest, NextApiResponse } from 'next';
import { getTranslationService } from '@/lib/translation-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const translationService = getTranslationService();
    const stats = await translationService.getCacheStats();
    const providerAvailable = translationService.isProviderAvailable();
    const providerName = translationService.getProviderName();

    res.status(200).json({
      provider: {
        name: providerName,
        available: providerAvailable,
      },
      cache: stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Translation status API error:', error);
    res.status(500).json({ 
      error: 'Failed to get translation status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}






