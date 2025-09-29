import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LanguageToggle from './LanguageToggle';
import { getDirection, getLanguageName } from '@/lib/i18n';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export default function Layout({ 
  children, 
  title = 'JoAutomation Dashboard',
  description = 'AI-powered accounting automation system',
  className = ''
}: LayoutProps) {
  const router = useRouter();
  const { locale } = router;
  const currentLocale = locale || 'en';
  const direction = getDirection(currentLocale);
  const languageName = getLanguageName(currentLocale);

  useEffect(() => {
    // Update document attributes
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', currentLocale);
  }, [direction, currentLocale]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="language" content={currentLocale} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* SEO and hreflang */}
        <link rel="alternate" hrefLang="en" href={`https://yourapp.com/en${router.asPath}`} />
        <link rel="alternate" hrefLang="ar" href={`https://yourapp.com/ar${router.asPath}`} />
        <link rel="alternate" hrefLang="x-default" href={`https://yourapp.com/en${router.asPath}`} />
        
        {/* RTL CSS */}
        <style jsx global>{`
          html[dir="rtl"] {
            direction: rtl;
          }
          html[dir="ltr"] {
            direction: ltr;
          }
          
          /* RTL-specific styles */
          html[dir="rtl"] .rtl-flip {
            transform: scaleX(-1);
          }
          
          /* Logical properties for better RTL support */
          .text-start { text-align: start; }
          .text-end { text-align: end; }
          .ms-0 { margin-inline-start: 0; }
          .me-0 { margin-inline-end: 0; }
          .ps-0 { padding-inline-start: 0; }
          .pe-0 { padding-inline-end: 0; }
        `}</style>
      </Head>
      
      <div className={`min-h-screen bg-gray-50 ${className}`} dir={direction}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  JoAutomation
                </h1>
                <span className="ml-2 text-sm text-gray-500">
                  {languageName}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center text-sm text-gray-500">
              <p>© 2024 JoAutomation. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}








