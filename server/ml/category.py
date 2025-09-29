"""
ML Category Classifier for Invoice Line Items
Lightweight model for mapping descriptions to GL categories
"""

import re
import pickle
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import numpy as np
import logging

logger = logging.getLogger(__name__)


class CategoryClassifier:
    """ML classifier for invoice line item categorization"""
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.categories = {}
        self.vendor_priors = {}
        self.is_trained = False
        
        # Define GL categories
        self.gl_categories = {
            'office_supplies': 'Office Supplies',
            'software': 'Software & Licenses',
            'travel': 'Travel & Transportation',
            'meals': 'Meals & Entertainment',
            'utilities': 'Utilities',
            'rent': 'Rent & Facilities',
            'marketing': 'Marketing & Advertising',
            'professional_services': 'Professional Services',
            'equipment': 'Equipment & Hardware',
            'training': 'Training & Education',
            'insurance': 'Insurance',
            'legal': 'Legal & Compliance',
            'taxes': 'Taxes & Fees',
            'banking': 'Banking & Finance',
            'telecommunications': 'Telecommunications',
            'maintenance': 'Maintenance & Repairs',
            'other': 'Other Expenses'
        }
        
        # Initialize with some basic patterns
        self._initialize_patterns()
    
    def _initialize_patterns(self):
        """Initialize with basic pattern-based categorization"""
        self.patterns = {
            'office_supplies': [
                r'\b(pen|pencil|paper|notebook|folder|stapler|clip|envelope|stamp|ink|toner|printer|scanner|desk|chair|office)\b',
                r'\b(مكتب|ورق|قلم|مجلد|مشبك|مظروف|طابع|حبر|طابعة|ماسح|مكتب|كرسي)\b'
            ],
            'software': [
                r'\b(software|license|subscription|saas|cloud|microsoft|adobe|google|aws|azure|slack|zoom|teams)\b',
                r'\b(برنامج|ترخيص|اشتراك|سحابي|مايكروسوفت|أدوبي|جوجل|أمازون|أزور|سلاك|زووم|تيمز)\b'
            ],
            'travel': [
                r'\b(travel|flight|hotel|taxi|uber|lyft|car rental|gas|fuel|parking|toll|airline|train|bus)\b',
                r'\b(سفر|طيران|فندق|تاكسي|أوبر|ليفت|إيجار سيارة|بنزين|وقود|موقف|طريق|قطار|حافلة)\b'
            ],
            'meals': [
                r'\b(meal|food|restaurant|lunch|dinner|breakfast|catering|coffee|tea|snack|dining)\b',
                r'\b(وجبة|طعام|مطعم|غداء|عشاء|فطور|تجهيز|قهوة|شاي|وجبة خفيفة|طعام)\b'
            ],
            'utilities': [
                r'\b(electricity|water|gas|internet|phone|electric|utility|power|energy|broadband)\b',
                r'\b(كهرباء|ماء|غاز|إنترنت|هاتف|كهربائي|مرافق|طاقة|طاقة|نطاق عريض)\b'
            ],
            'rent': [
                r'\b(rent|lease|office|space|facility|building|warehouse|storage|property|real estate)\b',
                r'\b(إيجار|عقد|مكتب|مساحة|مرفق|مبنى|مستودع|تخزين|عقار|عقارات)\b'
            ],
            'marketing': [
                r'\b(marketing|advertising|promotion|campaign|social media|facebook|instagram|twitter|linkedin|google ads)\b',
                r'\b(تسويق|إعلان|ترويج|حملة|وسائل التواصل|فيسبوك|إنستغرام|تويتر|لينكد إن|إعلانات جوجل)\b'
            ],
            'professional_services': [
                r'\b(consulting|legal|accounting|audit|lawyer|accountant|consultant|advisor|expert|specialist)\b',
                r'\b(استشارات|قانوني|محاسبة|مراجعة|محامي|محاسب|مستشار|خبير|متخصص)\b'
            ],
            'equipment': [
                r'\b(computer|laptop|server|monitor|keyboard|mouse|hardware|equipment|machine|device|tool)\b',
                r'\b(كمبيوتر|لابتوب|خادم|شاشة|لوحة مفاتيح|فأرة|أجهزة|معدات|آلة|جهاز|أداة)\b'
            ],
            'training': [
                r'\b(training|course|education|seminar|workshop|conference|learning|certification|skill|development)\b',
                r'\b(تدريب|دورة|تعليم|ندوة|ورشة|مؤتمر|تعلم|شهادة|مهارة|تطوير)\b'
            ],
            'insurance': [
                r'\b(insurance|coverage|policy|premium|claim|liability|health|property|business|auto)\b',
                r'\b(تأمين|تغطية|بوليصة|قسط|مطالبة|مسؤولية|صحة|ممتلكات|عمل|سيارة)\b'
            ],
            'legal': [
                r'\b(legal|law|court|litigation|contract|agreement|compliance|regulation|patent|trademark)\b',
                r'\b(قانوني|قانون|محكمة|تقاضي|عقد|اتفاق|امتثال|تنظيم|براءة اختراع|علامة تجارية)\b'
            ],
            'taxes': [
                r'\b(tax|vat|gst|income tax|property tax|sales tax|tax return|filing|audit|penalty)\b',
                r'\b(ضريبة|ضريبة القيمة المضافة|ضريبة الدخل|ضريبة الممتلكات|ضريبة المبيعات|إقرار ضريبي|تقديم|مراجعة|غرامة)\b'
            ],
            'banking': [
                r'\b(bank|banking|loan|credit|interest|fee|charge|transfer|payment|finance|financial)\b',
                r'\b(بنك|مصرف|قرض|ائتمان|فائدة|رسوم|تحويل|دفع|مالي|مالية)\b'
            ],
            'telecommunications': [
                r'\b(phone|mobile|telecom|internet|broadband|data|roaming|sim|network|connection)\b',
                r'\b(هاتف|جوال|اتصالات|إنترنت|نطاق عريض|بيانات|تجوال|شريحة|شبكة|اتصال)\b'
            ],
            'maintenance': [
                r'\b(maintenance|repair|service|fix|upgrade|installation|cleaning|janitorial|plumbing|electrical)\b',
                r'\b(صيانة|إصلاح|خدمة|إصلاح|ترقية|تركيب|تنظيف|حراسة|سباكة|كهربائية)\b'
            ]
        }
    
    def predict_category(self, description: str, vendor_name: str = None) -> Tuple[str, float]:
        """Predict category for a line item description"""
        if not description:
            return 'other', 0.0
        
        description = description.lower().strip()
        
        # Try pattern matching first
        pattern_confidence = self._predict_with_patterns(description)
        if pattern_confidence[1] > 0.7:  # High confidence from patterns
            return pattern_confidence
        
        # Use ML model if available
        if self.is_trained and self.model and self.vectorizer:
            ml_confidence = self._predict_with_ml(description, vendor_name)
            if ml_confidence[1] > 0.6:  # Good confidence from ML
                return ml_confidence
        
        # Fallback to pattern matching with lower threshold
        if pattern_confidence[1] > 0.3:
            return pattern_confidence
        
        # Default to 'other'
        return 'other', 0.1
    
    def _predict_with_patterns(self, description: str) -> Tuple[str, float]:
        """Predict category using pattern matching"""
        best_category = 'other'
        best_score = 0.0
        
        for category, patterns in self.patterns.items():
            score = 0.0
            matches = 0
            
            for pattern in patterns:
                if re.search(pattern, description, re.IGNORECASE):
                    matches += 1
                    score += 1.0
            
            if matches > 0:
                # Normalize score by number of patterns
                normalized_score = score / len(patterns)
                if normalized_score > best_score:
                    best_score = normalized_score
                    best_category = category
        
        return best_category, best_score
    
    def _predict_with_ml(self, description: str, vendor_name: str = None) -> Tuple[str, float]:
        """Predict category using ML model"""
        try:
            # Prepare features
            features = self._prepare_features(description, vendor_name)
            
            # Predict
            prediction = self.model.predict([features])[0]
            probabilities = self.model.predict_proba([features])[0]
            
            # Get confidence
            confidence = max(probabilities)
            
            # Map prediction to category
            category = self.categories.get(prediction, 'other')
            
            return category, confidence
            
        except Exception as e:
            logger.warning(f"ML prediction failed: {e}")
            return 'other', 0.0
    
    def _prepare_features(self, description: str, vendor_name: str = None) -> str:
        """Prepare features for ML model"""
        # Combine description and vendor name
        features = description
        
        if vendor_name:
            features += f" {vendor_name.lower()}"
        
        return features
    
    def train_model(self, training_data: List[Dict[str, Any]]):
        """Train the ML model with provided data"""
        if not training_data:
            logger.warning("No training data provided")
            return
        
        logger.info(f"Training ML model with {len(training_data)} samples")
        
        # Prepare training data
        descriptions = []
        categories = []
        
        for item in training_data:
            description = item.get('description', '').lower()
            category = item.get('category', 'other')
            
            if description and category:
                descriptions.append(description)
                categories.append(category)
        
        if len(descriptions) < 10:
            logger.warning("Insufficient training data for ML model")
            return
        
        # Create vectorizer
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=2
        )
        
        # Vectorize descriptions
        X = self.vectorizer.fit_transform(descriptions)
        
        # Create category mapping
        unique_categories = list(set(categories))
        self.categories = {i: cat for i, cat in enumerate(unique_categories)}
        category_to_index = {cat: i for i, cat in enumerate(unique_categories)}
        
        # Convert categories to indices
        y = [category_to_index[cat] for cat in categories]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        self.model = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Model trained with accuracy: {accuracy:.3f}")
        
        # Save model
        self._save_model()
        
        self.is_trained = True
    
    def _save_model(self):
        """Save trained model to disk"""
        try:
            model_data = {
                'model': self.model,
                'vectorizer': self.vectorizer,
                'categories': self.categories,
                'vendor_priors': self.vendor_priors
            }
            
            with open('server/ml/category_model.pkl', 'wb') as f:
                pickle.dump(model_data, f)
            
            logger.info("Model saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    def _load_model(self):
        """Load trained model from disk"""
        try:
            with open('server/ml/category_model.pkl', 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.vectorizer = model_data['vectorizer']
            self.categories = model_data['categories']
            self.vendor_priors = model_data.get('vendor_priors', {})
            
            self.is_trained = True
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.warning(f"Failed to load model: {e}")
    
    def get_category_name(self, category_code: str) -> str:
        """Get human-readable category name"""
        return self.gl_categories.get(category_code, 'Other Expenses')
    
    def get_all_categories(self) -> Dict[str, str]:
        """Get all available categories"""
        return self.gl_categories.copy()
    
    def add_vendor_prior(self, vendor_name: str, category: str, confidence: float):
        """Add vendor-specific category prior"""
        if vendor_name not in self.vendor_priors:
            self.vendor_priors[vendor_name] = {}
        
        self.vendor_priors[vendor_name][category] = confidence
    
    def get_vendor_prior(self, vendor_name: str, category: str) -> float:
        """Get vendor-specific category prior"""
        if vendor_name in self.vendor_priors:
            return self.vendor_priors[vendor_name].get(category, 0.0)
        return 0.0


# Global classifier instance
classifier = CategoryClassifier()

# Try to load existing model
classifier._load_model()


def predict_line_item_category(description: str, vendor_name: str = None) -> Tuple[str, float]:
    """Predict category for a line item"""
    return classifier.predict_category(description, vendor_name)


def get_category_name(category_code: str) -> str:
    """Get human-readable category name"""
    return classifier.get_category_name(category_code)


def train_category_model(training_data: List[Dict[str, Any]]):
    """Train the category model"""
    classifier.train_model(training_data)







