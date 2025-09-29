import { GetStaticProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import TranslatedContent from '@/components/TranslatedContent';
import { useTranslation as useCustomTranslation } from '@/lib/use-translation';
import { useState } from 'react';

export default function Home() {
  const { t } = useTranslation('common');
  const { translate, loading } = useCustomTranslation();
  const [aiContent, setAiContent] = useState('');

  const handleTranslateAI = async () => {
    const sampleAI = "This is AI-generated content about financial analysis. It contains important insights about your business performance and recommendations for improvement.";
    const result = await translate(sampleAI);
    setAiContent(result.translatedText);
  };

  return (
    <Layout title={t('dashboard.title')} description={t('dashboard.description')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Static Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{t('dashboard.staticContent')}</h2>
            <p className="text-gray-600 mb-4">
              {t('dashboard.staticDescription')}
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full me-2"></span>
                {t('dashboard.feature1')}
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full me-2"></span>
                {t('dashboard.feature2')}
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full me-2"></span>
                {t('dashboard.feature3')}
              </li>
            </ul>
          </div>

          {/* Dynamic AI Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{t('dashboard.aiContent')}</h2>
            <p className="text-gray-600 mb-4">
              {t('dashboard.aiDescription')}
            </p>
            
            <button
              onClick={handleTranslateAI}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mb-4 disabled:opacity-50"
            >
              {loading ? t('dashboard.translating') : t('dashboard.translateAI')}
            </button>

            {aiContent && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">{t('dashboard.translatedContent')}</h3>
                <p className="text-gray-700">{aiContent}</p>
              </div>
            )}
          </div>

          {/* HTML Content Translation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{t('dashboard.htmlContent')}</h2>
            <TranslatedContent
              preserveHtml={true}
              context="dashboard"
            >
              <div>
                <h3>Financial Analysis Report</h3>
                <p>This report contains <strong>important financial data</strong> and <em>recommendations</em>.</p>
                <ul>
                  <li>Revenue: $50,000</li>
                  <li>Expenses: $30,000</li>
                  <li>Profit: $20,000</li>
                </ul>
              </div>
            </TranslatedContent>
          </div>

          {/* RTL Layout Demo */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">{t('dashboard.rtlDemo')}</h2>
            <p className="text-gray-600 mb-4">
              {t('dashboard.rtlDescription')}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{t('dashboard.leftToRight')}</span>
                <span className="text-sm font-medium">{t('dashboard.rightToLeft')}</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};








