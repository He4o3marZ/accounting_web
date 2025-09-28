// Enhanced Language Manager - Unified Implementation
// Single source of truth for English-Arabic language switching with dynamic content support

class EnhancedLanguageManager {
        constructor() {
        // Get initial language from localStorage
        const storedLang = localStorage.getItem('i18nextLng');
        this.currentLanguage = storedLang || 'en';
        this.supportedLanguages = ['en', 'ar'];
        this.isInitialized = false;
        this.translationCache = new Map();
        
        // Sync with global variable for dashboard compatibility
        window.currentLanguage = this.currentLanguage;
        
        console.log('🌐 Enhanced Language Manager initialized with language:', this.currentLanguage);
        
        // Initialize immediately
        this.init();
    }

    async init() {
        try {
            console.log('🌐 Initializing Optimized Language Manager...');
            
            // Initialize i18next with optimized config
            await this.initI18next();
            
            // Apply initial language
            this.applyLanguage(this.currentLanguage);
            
            this.isInitialized = true;
            console.log('✅ Optimized Language Manager ready');
        } catch (error) {
            console.error('❌ Language init failed:', error);
            this.initFallback();
        }
    }

    async initI18next() {
        return new Promise((resolve) => {
            if (typeof i18next === 'undefined') {
                console.log('⚠️ i18next not available, using fallback');
                resolve();
                return;
            }

            i18next.init({
                lng: this.currentLanguage,
                fallbackLng: 'en',
                supportedLngs: ['en', 'ar'],
                debug: false,
    backend: {
                    loadPath: '/locales/{{lng}}/{{ns}}.json',
                    requestOptions: {
                        cache: 'default'
                    }
    },
    interpolation: {
      escapeValue: false
    },
                load: 'languageOnly',
                preload: ['en', 'ar']
            }, resolve);
        });
    }

    initFallback() {
        console.log('🔄 Using fallback language system');
        this.isInitialized = true;
        this.applyLanguage(this.currentLanguage);
    }

    applyLanguage(language) {
        const direction = language === 'ar' ? 'rtl' : 'ltr';
        
        // Update document attributes
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
        
        // Update body styles
        if (document.body) {
            document.body.style.direction = direction;
            document.body.style.textAlign = direction === 'rtl' ? 'right' : 'left';
        }
        
        // Update language toggle button
        this.updateLanguageToggle(language);
        
        // Update translations
        this.updateTranslations(language);
        
        // Apply RTL-specific styles
        this.applyRTLStyles(direction);
    
    // Update page title
        this.updatePageTitle(language);
        
        // console.log(`✅ Language applied: ${language} (${direction})`);
    }

        async switchLanguage(targetLanguage) {
        console.log('🔄 switchLanguage called with:', targetLanguage);
        console.log('🔄 Current language before switch:', this.currentLanguage);
        
        if (!this.supportedLanguages.includes(targetLanguage)) {
            console.error('❌ Unsupported language:', targetLanguage);
            return;
        }

        console.log(`🔄 Switching language from ${this.currentLanguage} to ${targetLanguage}`);
        
        // Add transition effect
        document.body.classList.add('language-transitioning');
        
        // Update current language IMMEDIATELY
        this.currentLanguage = targetLanguage;
        
        // Sync with global variable for dashboard compatibility
        window.currentLanguage = targetLanguage;
        
        // CRITICAL: Update localStorage IMMEDIATELY
        localStorage.setItem('i18nextLng', targetLanguage);
        
        console.log('🔄 Updated currentLanguage to:', this.currentLanguage);
        console.log('🔄 Updated window.currentLanguage to:', window.currentLanguage);
        console.log('🔄 Updated localStorage to:', targetLanguage);
        
        // Apply language changes in batch for better performance
        requestAnimationFrame(() => {
            console.log('🔄 Inside requestAnimationFrame, calling batchApplyLanguage');
            this.batchApplyLanguage(targetLanguage);
            
            // Remove transition effect
            setTimeout(() => {
                document.body.classList.remove('language-transitioning');
            }, 300);
            
            // Dispatch event for components
            this.dispatchLanguageChangeEvent(targetLanguage);
        });
    }

    batchApplyLanguage(language) {
        console.log('🔄 batchApplyLanguage called with:', language);
        const direction = language === 'ar' ? 'rtl' : 'ltr';
        console.log('🔄 Direction:', direction);
        
        // Batch DOM updates for better performance
        const updates = [
            () => {
                console.log('🔄 Updating document attributes');
                document.documentElement.lang = language;
                document.documentElement.dir = direction;
            },
            () => {
                console.log('🔄 Updating language toggle');
                this.updateLanguageToggle(language);
            },
            () => {
                console.log('🔄 Updating translations');
                this.updateTranslations(language);
            },
            () => {
                console.log('🔄 Applying RTL styles');
                this.applyRTLStyles(direction);
            },
            () => {
                console.log('🔄 Updating page title');
                this.updatePageTitle(language);
            }
        ];
        
        // Execute all updates
        updates.forEach(update => update());
        
        console.log(`✅ Language switched to ${language} (${direction})`);
    }

    updateLanguageToggle(language) {
        const toggleSelectors = [
            '#language-switcher',
            '#langToggle', 
            '#currentLang'
        ];
        
        for (const selector of toggleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const displayText = language === 'ar' ? 'AR' : 'EN';
                
                if (element.id === 'currentLang') {
                    element.textContent = displayText;
                } else {
                    const span = element.querySelector('span');
                    if (span) {
                        span.textContent = displayText;
                    } else {
                        element.innerHTML = `<i class="fas fa-globe"></i><span>${displayText}</span>`;
                    }
                }
                break;
            }
        }
    }

    updateTranslations(language) {
        console.log('🔄 updateTranslations called with:', language);
        
        // Ensure global variable is updated before calling dashboard function
        window.currentLanguage = language;
        console.log('🔄 Ensured window.currentLanguage is set to:', window.currentLanguage);
        
        // Always call the dashboard's updateLanguage function first for comprehensive translations
        if (typeof window.updateLanguage === 'function') {
            console.log('✅ Calling window.updateLanguage() for comprehensive translations');
            window.updateLanguage();
        } else {
            console.log('⚠️ window.updateLanguage not available');
        }
        
        // Also use i18next if available for data-i18n elements
        if (typeof i18next !== 'undefined' && i18next.isInitialized) {
            console.log('🔄 Also using i18next for data-i18n elements');
            this.updateTranslationsI18next(language);
        } else {
            console.log('🔄 i18next not available, using fallback for data-i18n elements');
            this.updateTranslationsFallback(language);
        }
    }

    updateTranslationsI18next(language) {
        // Update elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18next.t(key);
            
            if (translation && translation !== key) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    updateTranslationsFallback(language) {
        console.log('🔄 updateTranslationsFallback called with language:', language);
        // Call the dashboard's updateLanguage function if available
        if (typeof window.updateLanguage === 'function') {
            console.log('✅ Calling window.updateLanguage()');
            window.updateLanguage();
            return;
        }
        console.log('⚠️ window.updateLanguage not available, using fallback');
        
        // Fallback translation system
        const translations = {
            en: {
                'dashboard.title': 'Dashboard - JoAutomation',
                'dashboard.welcome': 'Welcome back, User!',
                'dashboard.buttons.login': 'Login',
                'dashboard.buttons.logout': 'Logout',
                'dashboard.navigation.overview': 'Dashboard',
                'dashboard.navigation.upload': 'Upload Data',
                'dashboard.navigation.analysis': 'Financial Analysis',
                'dashboard.navigation.balance-sheet': 'Balance Sheet',
                'dashboard.navigation.profit-loss': 'Profit & Loss',
                'dashboard.navigation.ledger': 'Ledger Accounts',
                'dashboard.navigation.budgeting': 'Budgeting',
                'dashboard.navigation.forecasting': 'Forecasting',
                'dashboard.navigation.advisor': 'AI Advisor',
                'dashboard.navigation.reports': 'Reports',
                'dashboard.navigation.alerts': 'Alerts'
            },
            ar: {
                'dashboard.title': 'لوحة التحكم - جوأتميشن',
                'dashboard.welcome': 'مرحباً بعودتك، المستخدم!',
                'dashboard.buttons.login': 'تسجيل الدخول',
                'dashboard.buttons.logout': 'تسجيل الخروج',
                'dashboard.navigation.overview': 'لوحة التحكم',
                'dashboard.navigation.upload': 'رفع البيانات',
                'dashboard.navigation.analysis': 'التحليل المالي',
                'dashboard.navigation.balance-sheet': 'الميزانية العمومية',
                'dashboard.navigation.profit-loss': 'قائمة الدخل',
                'dashboard.navigation.ledger': 'حسابات الأستاذ',
                'dashboard.navigation.budgeting': 'الميزانية',
                'dashboard.navigation.forecasting': 'التنبؤ',
                'dashboard.navigation.advisor': 'المستشار الذكي',
                'dashboard.navigation.reports': 'التقارير',
                'dashboard.navigation.alerts': 'التنبيهات'
            }
        };

        const t = translations[language];
        if (!t) return;

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = t[key];
            
            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    updatePageTitle(language) {
        const titles = {
            en: 'Dashboard - JoAutomation',
            ar: 'لوحة التحكم - جوأتميشن'
        };
        
        document.title = titles[language] || titles.en;
    }

    applyRTLStyles(direction) {
        // Update body classes for CSS targeting
        document.body.classList.remove('rtl', 'ltr');
        document.body.classList.add(direction);
        
        // Update body styles
        document.body.style.direction = direction;
        document.body.style.textAlign = direction === 'rtl' ? 'right' : 'left';
    }

    dispatchLanguageChangeEvent(language) {
        const direction = language === 'ar' ? 'rtl' : 'ltr';
        
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { 
                language, 
                direction,
                timestamp: Date.now()
            }
        }));
    }

    
    // Force sync language state with localStorage
    forceSyncLanguageState() {
        const storedLang = localStorage.getItem('i18nextLng');
        if (storedLang && storedLang !== this.currentLanguage) {
            console.log('🔄 Force syncing language state:', this.currentLanguage, '->', storedLang);
            this.currentLanguage = storedLang;
            window.currentLanguage = storedLang;
            this.applyLanguage(storedLang);
        }
    }

    
    // Force complete language state reset
    forceResetLanguageState() {
        const storedLang = localStorage.getItem('i18nextLng');
        const actualLang = storedLang || 'en';
        
        console.log('🔄 FORCE RESET: Resetting language state to:', actualLang);
        
        // Reset all state variables
        this.currentLanguage = actualLang;
        window.currentLanguage = actualLang;
        
        // Reset DOM attributes
        document.documentElement.lang = actualLang;
        document.documentElement.dir = actualLang === 'ar' ? 'rtl' : 'ltr';
        
        // Reset body classes
        document.body.classList.remove('rtl', 'ltr');
        document.body.classList.add(actualLang === 'ar' ? 'rtl' : 'ltr');
        
        // Reset body styles
        document.body.style.direction = actualLang === 'ar' ? 'rtl' : 'ltr';
        document.body.style.textAlign = actualLang === 'ar' ? 'right' : 'left';
        
        console.log('✅ FORCE RESET complete');
    }

    // Public API methods
            getCurrentLanguage() {
        // CRITICAL FIX: Always sync with localStorage first
        const storedLang = localStorage.getItem('i18nextLng');
        const actualLang = storedLang || 'en';
        
        // Force sync if there's any mismatch
        if (this.currentLanguage !== actualLang) {
            console.log('🔄 CRITICAL: Syncing language state mismatch:', this.currentLanguage, '->', actualLang);
            this.currentLanguage = actualLang;
            window.currentLanguage = actualLang;
            
            // Also update the visual state if needed
            if (document.documentElement.lang !== actualLang) {
                document.documentElement.lang = actualLang;
                document.documentElement.dir = actualLang === 'ar' ? 'rtl' : 'ltr';
            }
        }
        
        return this.currentLanguage;
    }

    getCurrentDirection() {
        return this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }

    translate(key, options = {}) {
        if (typeof i18next !== 'undefined' && i18next.isInitialized) {
  return i18next.t(key, options);
}

        // Fallback translation
        const fallbackTranslations = {
            en: {
                'dashboard.title': 'Dashboard - JoAutomation',
                'dashboard.welcome': 'Welcome back, User!'
            },
            ar: {
                'dashboard.title': 'لوحة التحكم - جوأتميشن',
                'dashboard.welcome': 'مرحباً بعودتك، المستخدم!'
            }
        };
        
        const translation = fallbackTranslations[this.currentLanguage]?.[key];
        return translation || key;
    }

    toggleLanguage() {
        const newLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
        this.switchLanguage(newLanguage);
    }

    // Enhanced methods for dynamic content translation
    translateDynamicContent(content, type = 'general') {
        console.log('🔄 translateDynamicContent called:', { content, type, language: this.currentLanguage });
        
        if (!content) return content;
        
        // Handle different content types
        switch(type) {
            case 'ai-insights':
                return this.translateAIInsights(content);
            case 'financial-data':
                return this.translateFinancialData(content);
            case 'user-upload':
                return this.translateUploadContent(content);
            case 'alerts':
                return this.translateAlerts(content);
            case 'highlights':
                return this.translateHighlights(content);
            default:
                return this.translateGeneralContent(content);
        }
    }

    translateAIInsights(insights) {
        if (Array.isArray(insights)) {
            return insights.map(insight => ({
                ...insight,
                message: this.translateGeneralContent(insight.message)
            }));
        }
        return insights;
    }

    translateFinancialData(data) {
        if (typeof data === 'object' && data !== null) {
            const translated = { ...data };
            
            // Translate common financial terms
            const financialTranslations = {
                en: {
                    'Revenue': 'Revenue',
                    'Expenses': 'Expenses',
                    'Profit': 'Profit',
                    'Loss': 'Loss',
                    'Cash Flow': 'Cash Flow',
                    'Balance Sheet': 'Balance Sheet',
                    'Income Statement': 'Income Statement',
                    'Assets': 'Assets',
                    'Liabilities': 'Liabilities',
                    'Equity': 'Equity'
                },
                ar: {
                    'Revenue': 'الإيرادات',
                    'Expenses': 'المصروفات',
                    'Profit': 'الربح',
                    'Loss': 'الخسارة',
                    'Cash Flow': 'التدفق النقدي',
                    'Balance Sheet': 'الميزانية العمومية',
                    'Income Statement': 'قائمة الدخل',
                    'Assets': 'الأصول',
                    'Liabilities': 'الخصوم',
                    'Equity': 'حقوق الملكية'
                }
            };

            // Translate object keys and values
            Object.keys(translated).forEach(key => {
                const translatedKey = financialTranslations[this.currentLanguage]?.[key] || key;
                if (translatedKey !== key) {
                    translated[translatedKey] = translated[key];
                    delete translated[key];
                }
            });

            return translated;
        }
        return data;
    }

    translateUploadContent(content) {
        if (typeof content === 'string') {
            return this.translateGeneralContent(content);
        }
        return content;
    }

    translateAlerts(alerts) {
        if (Array.isArray(alerts)) {
            return alerts.map(alert => ({
                ...alert,
                message: this.translateGeneralContent(alert.message),
                category: this.translateGeneralContent(alert.category || '')
            }));
        }
        return alerts;
    }

    translateHighlights(highlights) {
        if (Array.isArray(highlights)) {
            return highlights.map(highlight => ({
                ...highlight,
                message: this.translateGeneralContent(highlight.message)
            }));
        }
        return highlights;
    }

    translateGeneralContent(text) {
        if (typeof text !== 'string') return text;
        
        // Common phrase translations
        const phraseTranslations = {
            en: {
                'Small business': 'Small business',
                'Service-based business': 'Service-based business',
                'Retail business': 'Retail business',
                'Manufacturing business': 'Manufacturing business',
                'Technology business': 'Technology business',
                'Consulting business': 'Consulting business',
                'The business appears to be in good financial health': 'The business appears to be in good financial health',
                'Financial data successfully processed and analyzed': 'Financial data successfully processed and analyzed',
                'Balance sheet analysis completed': 'Balance sheet analysis completed',
                'Profit & Loss statement generated': 'Profit & Loss statement generated',
                'Ledger accounts processed successfully': 'Ledger accounts processed successfully',
                'No income recorded': 'No income recorded',
                'Negative cashflow detected': 'Negative cashflow detected',
                'Total expenses': 'Total expenses',
                'No chart of accounts data available': 'No chart of accounts data available',
                'No trial balance data available': 'No trial balance data available',
                'No general ledger data available': 'No general ledger data available',
                'No account balance data available': 'No account balance data available'
            },
            ar: {
                'Small business': 'نشاط تجاري صغير',
                'Service-based business': 'نشاط تجاري قائم على الخدمات',
                'Retail business': 'نشاط تجاري تجزئة',
                'Manufacturing business': 'نشاط تجاري تصنيع',
                'Technology business': 'نشاط تجاري تقني',
                'Consulting business': 'نشاط استشاري',
                'The business appears to be in good financial health': 'يبدو أن النشاط التجاري في صحة مالية جيدة',
                'Financial data successfully processed and analyzed': 'تم معالجة وتحليل البيانات المالية بنجاح',
                'Balance sheet analysis completed': 'تم إكمال تحليل الميزانية العمومية',
                'Profit & Loss statement generated': 'تم إنشاء قائمة الدخل',
                'Ledger accounts processed successfully': 'تم معالجة حسابات الأستاذ بنجاح',
                'No income recorded': 'لم يتم تسجيل أي دخل',
                'Negative cashflow detected': 'تم اكتشاف تدفق نقدي سلبي',
                'Total expenses': 'إجمالي المصروفات',
                'No chart of accounts data available': 'لا توجد بيانات مخطط الحسابات متاحة',
                'No trial balance data available': 'لا توجد بيانات ميزان المراجعة متاحة',
                'No general ledger data available': 'لا توجد بيانات الأستاذ العام متاحة',
                'No account balance data available': 'لا توجد بيانات أرصدة الحسابات متاحة'
            }
        };

        const translations = phraseTranslations[this.currentLanguage];
        if (!translations) return text;

        // Find and replace phrases
        let translatedText = text;
        Object.keys(translations).forEach(phrase => {
            const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            translatedText = translatedText.replace(regex, translations[phrase]);
        });

        return translatedText;
    }

    // Method to translate dashboard data
    translateDashboardData(data) {
        if (!data) return data;
        
        console.log('🔄 translateDashboardData called with:', data);
        
        const translated = { ...data };
        
        // Translate AI insights
        if (translated.aiInsights) {
            translated.aiInsights = this.translateFinancialData(translated.aiInsights);
        }
        
        // Translate alerts
        if (translated.allAlerts) {
            translated.allAlerts = this.translateAlerts(translated.allAlerts);
        }
        
        // Translate highlights
        if (translated.allHighlights) {
            translated.allHighlights = this.translateHighlights(translated.allHighlights);
        }
        
        return translated;
    }
}

// Global instance - MUST initialize first to set language
window.languageManager = new EnhancedLanguageManager();

// Global functions for backward compatibility
window.switchLanguage = (lang) => window.languageManager.switchLanguage(lang);
window.toggleLanguage = () => window.languageManager.toggleLanguage();
window.getCurrentLanguage = () => window.languageManager.getCurrentLanguage();
window.getCurrentDirection = () => window.languageManager.getCurrentDirection();
window.t = (key, options) => window.languageManager.translate(key, options);

// Enhanced global functions for dynamic content translation
window.translateDynamicContent = (content, type) => window.languageManager.translateDynamicContent(content, type);
window.translateDashboardData = (data) => window.languageManager.translateDashboardData(data);
window.translateAIInsights = (insights) => window.languageManager.translateAIInsights(insights);
window.translateAlerts = (alerts) => window.languageManager.translateAlerts(alerts);
window.translateHighlights = (highlights) => window.languageManager.translateHighlights(highlights);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
        console.log('🌐 Optimized Language Manager ready');
        // Ensure the language manager is available globally
        if (window.languageManager) {
            console.log('✅ Language Manager initialized successfully');
        } else {
            console.error('❌ Language Manager failed to initialize');
        }
    });
} else {
    console.log('🌐 Optimized Language Manager ready');
    // Ensure the language manager is available globally
    if (window.languageManager) {
        console.log('✅ Language Manager initialized successfully');
  } else {
        console.error('❌ Language Manager failed to initialize');
    }
}
