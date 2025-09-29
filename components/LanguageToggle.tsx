import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getLanguageName, getDirection, isValidLocale } from '@/lib/i18n';

interface LanguageToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function LanguageToggle({ className = '', showLabel = true }: LanguageToggleProps) {
  const router = useRouter();
  const { locale, pathname, asPath, query } = router;
  const [isLoading, setIsLoading] = useState(false);

  const currentLocale = locale || 'en';
  const isRTL = getDirection(currentLocale) === 'rtl';
  const otherLocale = currentLocale === 'en' ? 'ar' : 'en';
  const otherLanguageName = getLanguageName(otherLocale);

  const handleLanguageChange = async () => {
    if (isLoading) return;

    setIsLoading(true);
    
    try {
      // Update the router with the new locale
      await router.push(
        { pathname, query },
        asPath,
        { locale: otherLocale }
      );
    } catch (error) {
      console.error('Language change failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update document direction when locale changes
  useEffect(() => {
    const direction = getDirection(currentLocale);
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', currentLocale);
  }, [currentLocale]);

  return (
    <button
      onClick={handleLanguageChange}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 px-3 py-2 
        bg-blue-600 hover:bg-blue-700 
        text-white text-sm font-medium
        rounded-md transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      aria-pressed={currentLocale === 'ar'}
      aria-label={`Switch to ${otherLanguageName}`}
      title={`Switch to ${otherLanguageName}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      
      {isLoading ? (
        <span className="animate-pulse">...</span>
      ) : (
        <span>{otherLanguageName}</span>
      )}
      
      {showLabel && (
        <span className="sr-only">
          Current language: {getLanguageName(currentLocale)}
        </span>
      )}
    </button>
  );
}








