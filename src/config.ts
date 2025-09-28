/**
 * Configuration for the enhanced AI service
 */
export const config = {
    OPENAI_API_KEY: process.env['OPENAI_API_KEY'] || '',
    LOG_LEVEL: process.env['LOG_LEVEL'] || 'info',
    CACHE_TTL: parseInt(process.env['CACHE_TTL'] || '3600000'), // 1 hour
    MAX_CONCURRENCY: parseInt(process.env['MAX_CONCURRENCY'] || '5'),
    REQUEST_TIMEOUT: parseInt(process.env['REQUEST_TIMEOUT'] || '30000'), // 30 seconds
    MAX_RETRIES: parseInt(process.env['MAX_RETRIES'] || '3'),
    SIMILARITY_THRESHOLD: parseFloat(process.env['SIMILARITY_THRESHOLD'] || '0.85'),
    CONFIDENCE_THRESHOLD: parseFloat(process.env['CONFIDENCE_THRESHOLD'] || '0.7')
};
