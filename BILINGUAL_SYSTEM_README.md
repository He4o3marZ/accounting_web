# Bilingual English/Arabic System

This Next.js application implements a comprehensive bilingual system with AI-powered translation, caching, and RTL/LTR layout support.

## Features

### ✅ **Static UI Translation**
- i18n keys for all UI strings
- Instant language switching
- No flicker on toggle
- SEO-friendly localized routes (`/en/*`, `/ar/*`)

### ✅ **Dynamic AI Content Translation**
- Translation memory with Redis caching
- Fallback to in-memory LRU cache
- HTML-safe translation (preserves tags)
- Batch translation support

### ✅ **RTL/LTR Layout Support**
- Automatic direction switching
- CSS logical properties
- Tailwind CSS RTL utilities
- Proper form and table alignment

### ✅ **Machine Translation Providers**
- OpenAI GPT integration
- Stub provider for development
- Easy provider swapping
- Configurable via environment variables

### ✅ **Security & Performance**
- HTML sanitization with DOMPurify
- Translation caching
- Error handling and fallbacks
- Accessibility compliance

## Quick Start

### 1. Environment Setup

```bash
# Copy environment variables
cp .env.example .env.local

# Set your API keys
OPENAI_API_KEY=your_openai_api_key_here
REDIS_URL=redis://localhost:6379  # Optional, falls back to memory cache
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the bilingual dashboard.

## Usage

### Static Content Translation

Use the `useTranslation` hook for static content:

```tsx
import { useTranslation } from 'next-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.description')}</p>
    </div>
  );
}
```

### Dynamic AI Content Translation

Use the custom translation hook for AI-generated content:

```tsx
import { useTranslation } from '@/lib/use-translation';

function AIContent() {
  const { translate, loading } = useTranslation();
  const [translatedContent, setTranslatedContent] = useState('');

  const handleTranslate = async () => {
    const result = await translate('AI-generated content here');
    setTranslatedContent(result.translatedText);
  };

  return (
    <div>
      <button onClick={handleTranslate} disabled={loading}>
        {loading ? 'Translating...' : 'Translate'}
      </button>
      <p>{translatedContent}</p>
    </div>
  );
}
```

### HTML Content Translation

For HTML content that needs to preserve structure:

```tsx
import TranslatedContent from '@/components/TranslatedContent';

function HTMLContent() {
  return (
    <TranslatedContent preserveHtml={true}>
      <div>
        <h3>Financial Report</h3>
        <p>This contains <strong>important data</strong>.</p>
      </div>
    </TranslatedContent>
  );
}
```

### Language Toggle

Use the accessible language toggle component:

```tsx
import LanguageToggle from '@/components/LanguageToggle';

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <LanguageToggle />
    </header>
  );
}
```

## API Endpoints

### Translate Single Text
```bash
POST /api/translate
{
  "text": "Hello world",
  "targetLang": "ar",
  "sourceLang": "auto",
  "preserveHtml": false,
  "context": "dashboard"
}
```

### Batch Translation
```bash
POST /api/translate/batch
{
  "requests": [
    {
      "text": "Hello",
      "targetLang": "ar"
    },
    {
      "text": "World",
      "targetLang": "ar"
    }
  ]
}
```

### Translation Status
```bash
GET /api/translate/status
```

## Configuration

### Translation Memory

Configure caching in `lib/translation-memory.ts`:

```typescript
const translationMemory = new TranslationMemory({
  redisUrl: process.env.REDIS_URL,
  maxMemoryCacheSize: 1000,
  defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
});
```

### Machine Translation Provider

Configure providers in `lib/translation-providers.ts`:

```typescript
// OpenAI (requires OPENAI_API_KEY)
const provider = new OpenAITranslationProvider(apiKey);

// Stub (for development)
const provider = new StubTranslationProvider();
```

### RTL/LTR Support

The system automatically handles RTL/LTR switching:

- Document direction updates automatically
- CSS logical properties used throughout
- Tailwind utilities for RTL support
- Form elements align correctly

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage

- Translation memory caching
- HTML text node extraction
- Translation provider interfaces
- RTL/LTR layout switching

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Required for production:

```bash
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=redis://your-redis-instance:6379
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### SEO Configuration

Update hreflang URLs in `components/Layout.tsx`:

```tsx
<link rel="alternate" hrefLang="en" href={`https://yourapp.com/en${router.asPath}`} />
<link rel="alternate" hrefLang="ar" href={`https://yourapp.com/ar${router.asPath}`} />
```

## Architecture

```
lib/
├── translation-memory.ts      # Redis + memory caching
├── translation-providers.ts   # MT provider interfaces
├── translation-service.ts     # Main translation service
├── html-translator.ts         # HTML-safe translation
├── use-translation.ts         # React hooks
└── i18n.ts                   # i18n utilities

components/
├── LanguageToggle.tsx         # Accessible language switcher
├── TranslatedContent.tsx      # Dynamic content translation
└── Layout.tsx                 # RTL/LTR layout wrapper

pages/api/translate/
├── index.ts                   # Single translation endpoint
├── batch.ts                   # Batch translation endpoint
└── status.ts                  # Translation status endpoint
```

## Troubleshooting

### Common Issues

1. **Translation not working**: Check API keys and provider availability
2. **RTL layout broken**: Ensure CSS logical properties are used
3. **Cache not working**: Verify Redis connection or check memory cache
4. **HTML translation issues**: Check DOMPurify configuration

### Debug Mode

Enable debug logging:

```bash
DEBUG=translation:* npm run dev
```

## Contributing

1. Add new translation keys to `public/locales/`
2. Update TypeScript interfaces as needed
3. Add tests for new functionality
4. Ensure RTL/LTR compatibility
5. Test with both languages

## License

MIT License - see LICENSE file for details.








