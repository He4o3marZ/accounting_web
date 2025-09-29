import { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from '@/lib/use-translation';

interface TranslatedContentProps {
  children: ReactNode;
  targetLang?: string;
  preserveHtml?: boolean;
  context?: string;
  domain?: string;
  fallback?: ReactNode;
  className?: string;
}

export default function TranslatedContent({
  children,
  targetLang,
  preserveHtml = false,
  context,
  domain,
  fallback,
  className = '',
}: TranslatedContentProps) {
  const { translate, loading, error } = useTranslation();
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [isTranslated, setIsTranslated] = useState(false);

  useEffect(() => {
    const translateContent = async () => {
      if (typeof children !== 'string') return;

      const result = await translate(children, targetLang, {
        preserveHtml,
        context,
        domain,
      });

      if (result.error) {
        console.warn('Translation failed:', result.error);
        setTranslatedContent(children);
        setIsTranslated(false);
      } else {
        setTranslatedContent(result.translatedText);
        setIsTranslated(true);
      }
    };

    translateContent();
  }, [children, targetLang, preserveHtml, context, domain, translate]);

  if (typeof children !== 'string') {
    return <div className={className}>{children}</div>;
  }

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        {fallback || children}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {fallback || children}
      </div>
    );
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={preserveHtml ? { __html: translatedContent } : undefined}
    >
      {!preserveHtml && translatedContent}
    </div>
  );
}








