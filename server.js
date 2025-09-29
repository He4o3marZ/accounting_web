const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const aiService = require('./services/aiService');
const OCRService = require('./services/ocrService');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcryptjs');
const config = require('./config');

// Import models
const User = require('./models/User');
const Contact = require('./models/Contact');
const AccountingData = require('./models/AccountingData');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OCR service
const ocrService = new OCRService();

// ---- Robust date normalization helpers (CSV/Excel serials, dd.mm.yyyy) ----
function excelSerialToISO(serial) {
    if (typeof serial !== 'number') return null;
    // Excel serial date to JS Date (days since 1899-12-30)
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d) ? null : d.toISOString().split('T')[0];
}

function parseDateString(str) {
    if (typeof str !== 'string') return null;
    // Already ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // dd.mm.yyyy or dd/mm/yyyy or dd-mm-yyyy
    const m = str.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    const d = new Date(str);
    return isNaN(d) ? null : d.toISOString().split('T')[0];
}

function normalizeDate(value) {
    const fallback = new Date().toISOString().split('T')[0];
    if (value == null) return fallback;
    if (typeof value === 'number') return excelSerialToISO(value) || fallback;
    if (typeof value === 'string') return parseDateString(value) || fallback;
    return fallback;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Helper functions for invoice processing
function categorizeItem(description) {
    const desc = description.toLowerCase();
    if (desc.includes('transaction') || desc.includes('fee')) return 'Transaction Fees';
    if (desc.includes('vat') || desc.includes('tax')) return 'Tax';
    if (desc.includes('service')) return 'Service Fees';
    if (desc.includes('software') || desc.includes('license')) return 'Software';
    if (desc.includes('office') || desc.includes('supplies')) return 'Office Supplies';
    return 'General';
}

function extractVendor(pdfText) {
    const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line);
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (line.length > 10 && !line.match(/^\d+$/) && !line.includes('€') && !line.includes('Phone') && !line.includes('Invoice')) {
            return line;
        }
    }
    return 'Unknown Vendor';
}

function calculateVATRate(invoiceData) {
    if (invoiceData.vat && invoiceData.gross_total) {
        const netTotal = invoiceData.gross_total - invoiceData.vat;
        return Math.round((invoiceData.vat / netTotal) * 100);
    }
    return 19; // Default VAT rate
}

function removeCircularReferences(obj, seen = new WeakSet()) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (seen.has(obj)) {
        return '[Circular Reference]';
    }
    
    seen.add(obj);
    
    if (Array.isArray(obj)) {
        return obj.map(item => removeCircularReferences(item, seen));
    }
    
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            // Preserve important structures even if they have circular references
            if (key === 'lineItems' || key === 'totals' || key === 'processed' || 
                key === 'invoice_number' || key === 'currency' || key === 'date' ||
                key === 'invoiceNumber' || key === 'vendor') {
                result[key] = obj[key]; // Keep original structure
            } else {
                result[key] = removeCircularReferences(obj[key], seen);
            }
        }
    }
    
    return result;
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx', '.xls', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV, Excel, PDF, and image files are allowed.'), false);
        }
    }
});

// User-specific data storage
const accountingData = [];

// Progress tracking for file uploads
let uploadProgress = {
    isActive: false,
    percentage: 0,
    message: '',
    timestamp: 0
};

// Helper functions to generate basic financial module data
function generateBasicBalanceSheet(processedData, totalIncome, totalExpenses) {
    // Use actual transaction data instead of synthetic calculations
    const netIncome = totalIncome - totalExpenses;
    
    // Assets = actual net income (simplified for demo)
    const currentAssets = Math.max(0, netIncome);
    const fixedAssets = 0; // No fixed assets in transaction data
    const totalAssets = currentAssets + fixedAssets;
    
    // No liabilities in transaction data
    const currentLiabilities = 0;
    const longTermLiabilities = 0;
    const totalLiabilities = currentLiabilities + longTermLiabilities;
    
    // Equity = actual net income
    const equity = netIncome;
    
    return {
        balanceSheet: {
            assets: {
                current: {
                    total: currentAssets,
                    cash: currentAssets,
                    accountsReceivable: 0,
                    inventory: 0
                },
                fixed: {
                    total: fixedAssets,
                    equipment: 0,
                    buildings: 0
                },
                total: totalAssets
            },
            liabilities: {
                current: {
                    total: currentLiabilities,
                    accountsPayable: 0,
                    shortTermDebt: 0
                },
                longTerm: {
                    total: longTermLiabilities,
                    longTermDebt: 0
                },
                total: totalLiabilities
            },
            equity: {
                total: equity,
                retainedEarnings: equity,
                capital: 0
            }
        },
        ratios: {
            currentRatio: (currentAssets / currentLiabilities).toFixed(2),
            debtToEquity: (totalLiabilities / equity).toFixed(2),
            returnOnAssets: ((totalIncome - totalExpenses) / totalAssets * 100).toFixed(2)
        }
    };
}

function generateBasicProfitLoss(processedData, totalIncome, totalExpenses) {
    // Use actual transaction data
    const netIncome = totalIncome - totalExpenses;
    
    return {
        profitLoss: {
            revenue: {
                total: totalIncome,
                sales: totalIncome,
                other: 0
            },
            costOfGoodsSold: {
                total: totalExpenses,
                materials: totalExpenses,
                labor: 0,
                overhead: 0
            },
            grossProfit: {
                amount: netIncome,
                margin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
            },
            operatingExpenses: {
                total: 0,
                salaries: 0,
                rent: 0,
                utilities: 0,
                marketing: 0,
                professional: 0,
                travel: 0,
                other: 0
            },
            operatingIncome: {
                amount: netIncome,
                margin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
            },
            netIncome: {
                amount: netIncome,
                margin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
            }
        },
        margins: {
            grossMargin: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0,
            operatingMargin: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0,
            netMargin: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0
        }
    };
}

function generateBasicLedgerAccounts(processedData) {
    // Group transactions by category
    const accounts = {};
    processedData.forEach(transaction => {
        const category = transaction.category || 'General';
        if (!accounts[category]) {
            accounts[category] = {
                debits: 0,
                credits: 0,
                balance: 0,
                transactions: []
            };
        }
        
        if (transaction.amount < 0) {
            accounts[category].debits += Math.abs(transaction.amount);
            accounts[category].balance += transaction.amount;
        } else {
            accounts[category].credits += transaction.amount;
            accounts[category].balance += transaction.amount;
        }
        
        accounts[category].transactions.push(transaction);
    });
    
    return {
        ledgerAccounts: {
            chartOfAccounts: Object.keys(accounts).map(name => ({
                accountName: name,
                accountType: 'General',
                balance: accounts[name].balance
            })),
            trialBalance: Object.keys(accounts).map(name => ({
                account: name,
                debit: accounts[name].debits,
                credit: accounts[name].credits,
                balance: accounts[name].balance
            })),
            generalLedger: Object.keys(accounts).map(name => ({
                account: name,
                transactions: accounts[name].transactions
            }))
        }
    };
}

function generateBasicAssetsLiabilities(processedData) {
    const totalIncome = processedData.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = Math.abs(processedData.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    
    return {
        assets: {
            current: totalIncome * 0.3,
            fixed: totalIncome * 0.5,
            total: totalIncome * 0.8
        },
        liabilities: {
            current: totalExpenses * 0.2,
            longTerm: totalExpenses * 0.3,
            total: totalExpenses * 0.5
        },
        equity: (totalIncome * 0.8) - (totalExpenses * 0.5)
    };
}

function generateBasicBudget(processedData, totalIncome, totalExpenses) {
    const monthlyIncome = totalIncome / 12; // Assume annual data
    const monthlyExpenses = totalExpenses / 12;
    
    return {
        totalBudget: monthlyIncome * 12,
        actualSpending: totalExpenses,
        remainingBudget: (monthlyIncome * 12) - totalExpenses,
        monthlyBudget: {
            income: monthlyIncome,
            expenses: monthlyExpenses,
            savings: monthlyIncome - monthlyExpenses
        },
        categories: {
            fixed: monthlyExpenses * 0.6,
            variable: monthlyExpenses * 0.3,
            discretionary: monthlyExpenses * 0.1
        }
    };
}

function generateBasicForecast(processedData, totalIncome, totalExpenses) {
    const growthRate = 0.05; // 5% growth assumption
    const shortTermForecast = totalIncome * (1 + growthRate);
    const longTermForecast = totalIncome * Math.pow(1 + growthRate, 3);
    
    return {
        shortTermForecast: shortTermForecast,
        longTermForecast: longTermForecast,
        growthRate: growthRate * 100,
        forecasts: {
            nextMonth: totalIncome * (1 + growthRate/12),
            nextQuarter: totalIncome * (1 + growthRate/4),
            nextYear: totalIncome * (1 + growthRate)
        },
        trends: {
            income: growthRate,
            expenses: growthRate * 0.8,
            profit: growthRate * 1.2
        }
    };
}

// Middleware to get user from token
const getUserFromToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Handle admin users
        if (decoded.isAdmin && decoded.userId === 'admin') {
            req.user = {
                _id: 'admin',
                userId: 'admin',
                email: config.ADMIN_EMAIL,
                role: 'admin',
                firstName: 'Admin',
                isActive: true
            };
            return next();
        }
        
        // Handle regular users
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive user' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Optional middleware for routes that don't require authentication
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Handle admin users
        if (decoded.isAdmin && decoded.userId === 'admin') {
            req.user = {
                _id: 'admin',
                userId: 'admin',
                email: config.ADMIN_EMAIL,
                role: 'admin',
                firstName: 'Admin',
                isActive: true
            };
            return next();
        }
        
        // Handle regular users
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
            req.user = user;
        } else {
            req.user = null;
        }
        
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Contact form submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        const contact = new Contact({
            name,
            email,
            message,
            createdAt: new Date()
        });
        
        await contact.save();
        
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, company } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        const user = new User({
            email,
            password,
            firstName,
            lastName,
            company,
            role: 'user',
            isActive: true
        });
        
        await user.save();
        
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check for admin login
        if (email === config.ADMIN_EMAIL && password === config.ADMIN_PASSWORD) {
            const token = jwt.sign(
                { userId: 'admin', role: 'admin', isAdmin: true },
                config.JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({
                success: true,
                token,
                user: { email, role: 'admin', firstName: 'Admin' }
            });
        }
        
        // Check regular users
        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                company: user.company,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

// File upload and processing
app.post('/api/accounting/upload', optionalAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // Use admin as default if no user is authenticated
        const userId = req.user ? (req.user._id?.toString() || req.user.userId) : 'admin';
        const fileName = req.file.originalname;
        const fileBuffer = req.file.buffer;
        const fileExt = path.extname(fileName).toLowerCase();
        
        console.log('📁 Processing file:', fileName);
        
        // Initialize progress tracking
        uploadProgress = {
            isActive: true,
            percentage: 10,
            message: 'Starting file processing...',
            timestamp: Date.now()
        };
        
        let sampleData = [];
        
        // Parse file based on extension
        if (fileExt === '.pdf') {
            try {
                let pdfText;
                let isOCR = false;
                
                // Check if PDF needs OCR (image-based or Arabic)
                uploadProgress = {
                    isActive: true,
                    percentage: 20,
                    message: 'Analyzing PDF content...',
                    timestamp: Date.now()
                };
                
                const needsOCR = await ocrService.needsOCR(fileBuffer);
                
                    if (needsOCR) {
                        console.log('🔍 PDF requires OCR processing...');
                        uploadProgress = {
                            isActive: true,
                            percentage: 30,
                            message: 'Processing with OCR...',
                            timestamp: Date.now()
                        };
                        const ocrResult = await ocrService.processPDF(fileBuffer, fileName);
                        pdfText = ocrResult.text;
                        isOCR = true;
                        console.log(`📄 OCR extracted text (${ocrResult.pages} pages, confidence: ${ocrResult.confidence}%, Arabic: ${ocrResult.isArabic}):`, pdfText.substring(0, 500) + '...');
                    } else {
                        uploadProgress = {
                            isActive: true,
                            percentage: 25,
                            message: 'Extracting PDF text...',
                            timestamp: Date.now()
                        };
                        const pdfData = await pdfParse(fileBuffer);
                        pdfText = pdfData.text;
                        console.log('PDF text extracted:', pdfText.substring(0, 500) + '...');
                    }
                
                // Use AI to parse invoice with two-step pipeline
                uploadProgress = {
                    isActive: true,
                    percentage: 40,
                    message: 'Parsing invoice data...',
                    timestamp: Date.now()
                };
                const invoiceData = await aiService.parseInvoiceWithSchema(pdfText);
                console.log('✅ Invoice parsed with two-step pipeline:', invoiceData);
                
                // Set up progress callback for real-time updates
                const progressCallback = (progress, message) => {
                    console.log(`📊 Progress: ${progress}% - ${message}`);
                    uploadProgress = {
                        isActive: true,
                        percentage: 50 + (progress * 0.4), // Map 0-100 to 50-90
                        message: message,
                        timestamp: Date.now()
                    };
                };
                
                // Process with comprehensive financial analysis
                uploadProgress = {
                    isActive: true,
                    percentage: 50,
                    message: 'Running AI analysis...',
                    timestamp: Date.now()
                };
                const aiResult = await aiService.processAccountingDataComprehensive(invoiceData, progressCallback);
                // Debug: Budgeting & Forecasting summaries
                try {
                    console.log('🧮 Budget overview (PDF):', aiResult.budget?.analysis?.overall?.totals);
                    console.log('📈 Forecast short (PDF):', aiResult.forecasting?.forecasts?.shortTerm?.totalForecast);
                } catch (e) { /* noop */ }
                
                // Store the processed data - handle both old and new AI result structures
        const processedData = {
            id: Date.now().toString(),
            filename: fileName,
            uploadDate: new Date().toISOString(),
            expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
            income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || [],
            totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
            totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
            netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
            transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
            vendor: extractVendor(pdfText) || 'PDF Vendor',
            vatRate: invoiceData.totals?.vatRate || 19,
            isOCR: isOCR,
            currency: invoiceData.currency || '€',
            invoiceNumber: invoiceData.invoice_number || 'PDF-' + Date.now(),
            date: invoiceData.date || new Date().toISOString().split('T')[0],
            aiInsights: aiResult.aiInsights || [],
            alerts: aiResult.alerts || [],
            highlights: aiResult.highlights || [],
            processed: aiResult.cashflow?.totals || {},
            lineItems: invoiceData.lineItems || [],
            totals: invoiceData.totals || {}
        };
                
                // Save to database
                const accountingEntry = new AccountingData({
                    userId: userId,
                    filename: fileName,
                    uploadDate: new Date(),
                    expenses: processedData.expenses,
                    income: processedData.income,
                    totalExpenses: processedData.totalExpenses,
                    totalIncome: processedData.totalIncome,
                    netCashflow: processedData.netCashflow,
                    transactionCount: processedData.transactionCount,
                    vendor: processedData.vendor || 'PDF Upload',
                    vatRate: processedData.vatRate || 19,
                    isOCR: processedData.isOCR || false,
                    currency: processedData.currency || '€',
                    invoiceNumber: processedData.invoiceNumber || 'PDF-' + Date.now(),
                    notes: processedData.notes || '',
                    method: 'pdf-upload',
                    aiInsights: aiResult.aiInsights,
                    alerts: aiResult.alerts,
                    highlights: aiResult.highlights,
                    processed: aiResult.processed,
                    lineItems: processedData.lineItems || [],
                    totals: processedData.totals || {},
                    // Include comprehensive modules where available
                    cashflow: aiResult.cashflow || null,
                    assetsLiabilities: aiResult.assetsLiabilities || null,
                    debtsLoans: aiResult.debtsLoans || null,
                    taxesVAT: aiResult.taxesVAT || null,
                    budget: aiResult.budget || null,
                    forecasting: aiResult.forecasting || null,
                    multiCurrency: aiResult.multiCurrency || null,
                    report: aiResult.report || null,
                    balanceSheet: aiResult.balanceSheet || null,
                    profitLoss: aiResult.profitLoss || null,
                    ledgerAccounts: aiResult.ledgerAccounts || null
                });

            await accountingEntry.save();
            console.log('✅ PDF data processed and saved to database');
            
            // Create dataEntry for in-memory storage
            const dataEntry = {
                id: Date.now().toString(),
                userId: userId,
                filename: fileName,
                uploadDate: new Date().toISOString(),
                data: processedData,
                aiInsights: aiResult.aiInsights || {},
                alerts: aiResult.alerts || [],
                highlights: aiResult.highlights || [],
                cashflow: aiResult.cashflow || {},
                processed: {
                    totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
                    totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
                    netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
                    transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
                    expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
                    income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || []
                },
                expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
                income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || [],
                totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
                totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
                netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
                transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
                lineItems: processedData.lineItems || [],
                totals: processedData.totals || {},
                // Add invoice data at top level for easy access
                invoiceNumber: processedData.invoiceNumber,
                currency: processedData.currency,
                date: processedData.date,
                vendor: processedData.vendor,
                // Include comprehensive modules for client consumption
                assetsLiabilities: aiResult.assetsLiabilities || null,
                debtsLoans: aiResult.debtsLoans || null,
                taxesVAT: aiResult.taxesVAT || null,
                budget: aiResult.budget || null,
                forecasting: aiResult.forecasting || null,
                multiCurrency: aiResult.multiCurrency || null,
                report: aiResult.report || null,
                balanceSheet: aiResult.balanceSheet || null,
                profitLoss: aiResult.profitLoss || null,
                ledgerAccounts: aiResult.ledgerAccounts || null,
                // Add alerts and highlights from all modules
                allAlerts: [
                    ...(aiResult.alerts || []),
                    ...(aiResult.cashflow?.alerts || []),
                    ...(aiResult.assetsLiabilities?.alerts || []),
                    ...(aiResult.debtsLoans?.alerts || []),
                    ...(aiResult.taxesVAT?.alerts || []),
                    ...(aiResult.budget?.alerts || []),
                    ...(aiResult.forecasting?.alerts || []),
                    ...(aiResult.balanceSheet?.alerts || []),
                    ...(aiResult.profitLoss?.alerts || []),
                    ...(aiResult.ledgerAccounts?.alerts || [])
                ],
                allHighlights: [
                    ...(aiResult.highlights || []),
                    ...(aiResult.cashflow?.highlights || []),
                    ...(aiResult.assetsLiabilities?.highlights || []),
                    ...(aiResult.debtsLoans?.highlights || []),
                    ...(aiResult.taxesVAT?.highlights || []),
                    ...(aiResult.budget?.highlights || []),
                    ...(aiResult.forecasting?.highlights || []),
                    ...(aiResult.balanceSheet?.highlights || []),
                    ...(aiResult.profitLoss?.highlights || []),
                    ...(aiResult.ledgerAccounts?.highlights || [])
                ]
            };
            
            // Add to in-memory array for testing
            accountingData.push(dataEntry);
            
            // Debug: Check dataEntry invoice fields
            console.log('📊 dataEntry.invoiceNumber:', dataEntry.invoiceNumber);
            console.log('📊 dataEntry.currency:', dataEntry.currency);
            console.log('📊 dataEntry.date:', dataEntry.date);
            console.log('📊 dataEntry.vendor:', dataEntry.vendor);
                
                console.log('📊 invoiceData from AI:', invoiceData);
                console.log('📊 extractVendor result:', extractVendor(pdfText));
                console.log('PDF processed data:', processedData);
                console.log('📊 processedData.invoiceNumber:', processedData.invoiceNumber);
                console.log('📊 processedData.currency:', processedData.currency);
                console.log('📊 processedData.date:', processedData.date);
                console.log('📊 processedData.vendor:', processedData.vendor);
                console.log('✅ AI processing completed successfully');
                
                // Mark as completed
                uploadProgress = {
                    isActive: false,
                    percentage: 100,
                    message: 'Processing completed successfully!',
                    timestamp: Date.now()
                };
                
                // Clean data to remove circular references but preserve invoice data
                const cleanData = removeCircularReferences(dataEntry);

                res.json({
                    success: true,
                    message: 'PDF file processed successfully',
                    data: cleanData
                });
                
            } catch (error) {
                console.error('Error parsing PDF file:', error);
                res.status(400).json({
                    success: false,
                    message: 'Error parsing PDF file',
                    error: error.message
                });
            }
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'].includes(fileExt)) {
            // Image processing with Google Cloud Vision OCR
            try {
                console.log('🖼️ Processing image file:', fileName);
                
                uploadProgress = {
                    isActive: true,
                    percentage: 20,
                    message: 'Processing image with Google Cloud Vision...',
                    timestamp: Date.now()
                };
                
                // Process image with Google Cloud Vision OCR
                const ocrResult = await ocrService.processImage(fileBuffer, fileName);
                const imageText = ocrResult.text;
                const isOCR = true;
                
                console.log(`📄 Image OCR extracted text (confidence: ${ocrResult.confidence}%, Arabic: ${ocrResult.isArabic}):`, imageText.substring(0, 500) + '...');
                
                // Use AI to parse invoice with two-step pipeline
                uploadProgress = {
                    isActive: true,
                    percentage: 40,
                    message: 'Parsing invoice data from image...',
                    timestamp: Date.now()
                };
                const invoiceData = await aiService.parseInvoiceWithSchema(imageText);
                console.log('✅ Invoice parsed from image:', invoiceData);
                console.log('📊 InvoiceData invoice_number:', invoiceData.invoice_number);
                console.log('📊 InvoiceData keys:', Object.keys(invoiceData));
                
                // Set up progress callback for real-time updates
                const progressCallback = (progress, message) => {
                    console.log(`📊 Progress: ${progress}% - ${message}`);
                    uploadProgress = {
                        isActive: true,
                        percentage: 50 + (progress * 0.4), // Map 0-100 to 50-90
                        message: message,
                        timestamp: Date.now()
                    };
                };
                
                // Process with comprehensive financial analysis
                uploadProgress = {
                    isActive: true,
                    percentage: 50,
                    message: 'Running AI analysis...',
                    timestamp: Date.now()
                };
                const aiResult = await aiService.processAccountingDataComprehensive(invoiceData, progressCallback);
                
                console.log('📊 Before creating processedData, invoiceData:', JSON.stringify(invoiceData, null, 2));
                console.log('📊 invoiceData.invoice_number:', invoiceData.invoice_number);
                
                // Store the processed data
                const processedData = {
                    id: Date.now().toString(),
                    filename: fileName,
                    uploadDate: new Date().toISOString(),
                    expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
                    income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || [],
                    totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
                    totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
                    netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
                    transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
                    vendor: extractVendor(imageText),
                    vatRate: invoiceData.totals?.vatRate || 19,
                    isOCR: isOCR,
                    currency: invoiceData.currency || '€',
                    invoiceNumber: invoiceData.invoice_number,
                    aiInsights: aiResult.aiInsights || [],
                    alerts: aiResult.alerts || [],
                    highlights: aiResult.highlights || [],
                    processed: aiResult.cashflow?.totals || {},
                    lineItems: invoiceData.lineItems,
                    totals: invoiceData.totals
                };
                
                console.log('📊 processedData created:', JSON.stringify(processedData, null, 2));
                console.log('📊 processedData.invoiceNumber:', processedData.invoiceNumber);
                
                // Save to database
                const accountingEntry = new AccountingData({
                    userId: userId,
                    filename: fileName,
                    uploadDate: new Date(),
                    expenses: processedData.expenses,
                    income: processedData.income,
                    totalExpenses: processedData.totalExpenses,
                    totalIncome: processedData.totalIncome,
                    netCashflow: processedData.netCashflow,
                    transactionCount: processedData.transactionCount,
                    vendor: processedData.vendor || 'Image Upload',
                    vatRate: processedData.vatRate || 19,
                    isOCR: processedData.isOCR || true,
                    currency: (processedData.currency === '£' ? 'JOD' : processedData.currency) || '€', // Override £ to JOD for Arabic invoices
                    invoiceNumber: processedData.invoiceNumber || 'IMG-' + Date.now(),
                    notes: processedData.notes || '',
                    method: 'image-upload',
                    aiInsights: aiResult.aiInsights,
                    alerts: aiResult.alerts,
                    highlights: aiResult.highlights,
                    processed: aiResult.processed,
                    lineItems: processedData.lineItems || [],
                    totals: processedData.totals || {},
                    // Include comprehensive modules where available
                    cashflow: aiResult.cashflow || null,
                    assetsLiabilities: aiResult.assetsLiabilities || null,
                    debtsLoans: aiResult.debtsLoans || null,
                    taxesVAT: aiResult.taxesVAT || null,
                    budget: aiResult.budget || null,
                    forecasting: aiResult.forecasting || null,
                    multiCurrency: aiResult.multiCurrency || null,
                    report: aiResult.report || null,
                    balanceSheet: aiResult.balanceSheet || null,
                    profitLoss: aiResult.profitLoss || null,
                    ledgerAccounts: aiResult.ledgerAccounts || null
                });

            await accountingEntry.save();
            console.log('✅ Image data processed and saved to database');
                
                // Create dataEntry for in-memory storage
                const dataEntry = {
                    id: Date.now().toString(),
                    userId: userId,
                    filename: fileName,
                    uploadDate: new Date().toISOString(),
                    data: processedData,
                    aiInsights: aiResult.aiInsights || [],
                    alerts: aiResult.alerts || [],
                    highlights: aiResult.highlights || [],
                    cashflow: aiResult.cashflow || {},
                    processed: {
                        totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
                        totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
                        netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
                        transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
                        expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
                        income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || []
                    },
                    expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
                    income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || [],
                    totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
                    totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
                    netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
                    transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
                    lineItems: processedData.lineItems || [],
                    totals: processedData.totals || {},
                    invoiceNumber: processedData.invoiceNumber,
                    currency: processedData.currency === '£' ? 'JOD' : processedData.currency, // Override £ to JOD for Arabic invoices
                    date: processedData.date,
                    vendor: processedData.vendor,
                    // Include comprehensive modules for client consumption
                    assetsLiabilities: aiResult.assetsLiabilities || null,
                    debtsLoans: aiResult.debtsLoans || null,
                    taxesVAT: aiResult.taxesVAT || null,
                    budget: aiResult.budget || null,
                    forecasting: aiResult.forecasting || null,
                    multiCurrency: aiResult.multiCurrency || null,
                    report: aiResult.report || null,
                    balanceSheet: aiResult.balanceSheet || null,
                    profitLoss: aiResult.profitLoss || null,
                    ledgerAccounts: aiResult.ledgerAccounts || null
                };
                
                // Store in memory
                accountingData.push(dataEntry);
                
                uploadProgress = {
                    isActive: false,
                    percentage: 100,
                    message: 'Image processing complete!',
                    timestamp: Date.now()
                };
                
                // Create a safe copy without circular references for specific fields only

                // Create a safe copy without circular references
                // const safeDataEntry = removeCircularReferences(dataEntry);
                const safeDataEntry = dataEntry;

                res.json({
                    success: true,
                    message: 'Image file processed successfully',
                    data: safeDataEntry
                });
                
            } catch (error) {
                console.error('❌ Image processing error:', error);
                uploadProgress = {
                    isActive: false,
                    percentage: 0,
                    message: 'Image processing failed',
                    timestamp: Date.now()
                };
                res.status(500).json({
                    success: false,
                    message: 'Error processing image file',
                    error: error.message
                });
            }
        } else if (fileExt === '.csv') {
            // CSV processing
            uploadProgress = {
                isActive: true,
                percentage: 20,
                message: 'Parsing CSV file...',
                timestamp: Date.now()
            };
            
            const csvData = [];
            const stream = require('stream');
            const bufferStream = new stream.PassThrough();
            bufferStream.end(fileBuffer);
            
            bufferStream
                .pipe(csv())
                .on('data', (row) => csvData.push(row))
                .on('end', async () => {
                    console.log('CSV data parsed:', csvData.length, 'rows');
                    
                    uploadProgress = {
                        isActive: true,
                        percentage: 40,
                        message: 'Processing CSV data...',
                        timestamp: Date.now()
                    };
                    
                    // Convert CSV to our format - preserve original dates with normalization
                    const processedData = csvData.map(row => {
                        const dateStr = normalizeDate(row.Date ?? row.date);
                        return {
                            date: dateStr,
                            description: row.Description || row.description || 'Transaction',
                            amount: parseFloat(row.Amount || row.amount || 0),
                            category: row.Category || row.category || 'General',
                            vendor: row.Vendor || row.vendor || 'Unknown'
                        };
                    });
                    
                    // Convert to AI-expected format
                    // Calculate totals directly from CSV data first
                    const expenses = processedData.filter(row => row.amount < 0);
                    const income = processedData.filter(row => row.amount > 0);
                    const totalExpenses = Math.abs(expenses.reduce((sum, row) => sum + row.amount, 0));
                    const totalIncome = income.reduce((sum, row) => sum + row.amount, 0);
                    const netCashflow = totalIncome - totalExpenses;
                    
                    console.log('📊 Direct calculation:', { totalExpenses, totalIncome, netCashflow, expenses: expenses.length, income: income.length });
                    console.log('📊 Sample expenses:', expenses.slice(0, 3));
                    console.log('📊 Sample income:', income.slice(0, 3));
                    console.log('📊 Sample dates from CSV:', processedData.slice(0, 5).map(row => ({ date: row.date, description: row.description })));
                    
                    const aiInput = {
                        lineItems: processedData.map(row => ({
                            description: row.description,
                            total: row.amount,
                            quantity: 1,
                            unit_price: row.amount,
                            date: row.date // Include the actual date from CSV
                        })),
                        totals: {
                            totalIncome: totalIncome,
                            totalExpenses: totalExpenses,
                            netCashflow: netCashflow,
                            net: 0,
                            vat: 0,
                            gross: 0
                        },
                        currency: '€',
                        date: new Date().toISOString().split('T')[0]
                    };
                    
                    // Process with comprehensive financial analysis
                    uploadProgress = {
                        isActive: true,
                        percentage: 60,
                        message: 'Running AI analysis...',
                        timestamp: Date.now()
                    };
                    const aiResult = await aiService.processAccountingDataComprehensive(aiInput);
                    // Debug: Budgeting & Forecasting summaries
                    try {
                        console.log('🧮 Budget overview (CSV):', aiResult.budget?.analysis?.overall?.totals);
                        console.log('📈 Forecast short (CSV):', aiResult.forecasting?.forecasts?.shortTerm?.totalForecast);
                    } catch (e) { /* noop */ }
                    
        // Override AI result with direct calculation
        aiResult.cashflow = aiResult.cashflow || {};
        aiResult.cashflow.totals = {
            totalOutflow: totalExpenses,
            totalInflow: totalIncome,
            totalExpenses: totalExpenses,
            totalIncome: totalIncome,
            netCashflow,
            transactionCount: processedData.length
        };
        aiResult.cashflow.transactions = processedData;
        aiResult.expenses = expenses;
        aiResult.income = income;
        aiResult.totalExpenses = totalExpenses;
        aiResult.totalIncome = totalIncome;
        aiResult.netCashflow = netCashflow;
        aiResult.transactionCount = processedData.length;
                    
                    // Store the processed data
                    const dataEntry = {
                        id: Date.now().toString(),
                        userId: userId,
                        filename: fileName,
                        uploadDate: new Date().toISOString(),
                        data: processedData,
                        aiInsights: aiResult.aiInsights,
                        alerts: Array.isArray(aiResult.alerts) ? aiResult.alerts : [],
                        highlights: Array.isArray(aiResult.highlights) ? aiResult.highlights : [],
                        cashflow: aiResult.cashflow || {},
                        processed: {
                            totalExpenses: totalExpenses,
                            totalIncome: totalIncome,
                            netCashflow: netCashflow,
                            transactionCount: processedData.length,
                            expenses: expenses,
                            income: income
                        },
                        expenses: expenses,
                        income: income,
                        totalExpenses: totalExpenses,
                        totalIncome: totalIncome,
                        netCashflow: netCashflow,
                        // Comprehensive financial analysis data
                        assetsLiabilities: aiResult.assetsLiabilities || generateBasicAssetsLiabilities(processedData),
                        debtsLoans: aiResult.debtsLoans || null,
                        taxesVAT: aiResult.taxesVAT || null,
                        budget: aiResult.budget || generateBasicBudget(processedData, totalIncome, totalExpenses),
                        forecasting: aiResult.forecasting || generateBasicForecast(processedData, totalIncome, totalExpenses),
                        multiCurrency: aiResult.multiCurrency || null,
                        report: aiResult.report || null,
                        balanceSheet: aiResult.balanceSheet || {
                            balanceSheet: generateBasicBalanceSheet(processedData, totalIncome, totalExpenses)
                        },
                        profitLoss: aiResult.profitLoss || {
                            profitLoss: generateBasicProfitLoss(processedData, totalIncome, totalExpenses)
                        },
                        ledgerAccounts: {
                            ledgerAccounts: aiResult.ledgerAccounts || generateBasicLedgerAccounts(processedData)
                        },
                        transactionCount: processedData.length,
                        // Add invoice data at top level for CSV
                        invoiceNumber: 'CSV-' + Date.now(),
                        currency: '€',
                        date: new Date().toISOString().split('T')[0],
                        vendor: 'CSV Import',
                        lineItems: aiInput.lineItems,
                        totals: aiInput.totals
                    };
                    
                    // Debug: Check what aiResult contains
        console.log('🔍 Debug aiResult.alerts:', typeof aiResult.alerts, aiResult.alerts);
        console.log('🔍 Debug dataEntry.balanceSheet:', dataEntry.balanceSheet);
        console.log('🔍 Debug dataEntry.profitLoss:', dataEntry.profitLoss);
        console.log('🔍 Debug dataEntry.ledgerAccounts:', dataEntry.ledgerAccounts);
        console.log('🔍 Debug aiResult.highlights:', typeof aiResult.highlights, aiResult.highlights);
        console.log('🔍 Debug aiResult.cashflow:', typeof aiResult.cashflow, aiResult.cashflow?.length || 0, 'entries');
        console.log('🔍 Debug aiResult.balanceSheet:', typeof aiResult.balanceSheet, aiResult.balanceSheet);
        console.log('🔍 Debug aiResult.profitLoss:', typeof aiResult.profitLoss, aiResult.profitLoss);
        console.log('🔍 Debug aiResult.ledgerAccounts:', typeof aiResult.ledgerAccounts, aiResult.ledgerAccounts);
        console.log('🔍 Debug aiResult.assetsLiabilities:', typeof aiResult.assetsLiabilities, aiResult.assetsLiabilities);
                    
                    // Save to database
                    const accountingEntry = new AccountingData({
                        userId: userId,
                        filename: fileName,
                        uploadDate: new Date(),
                        expenses: Array.isArray(aiResult.processed?.expenses) ? aiResult.processed.expenses : [],
                        income: Array.isArray(aiResult.processed?.income) ? aiResult.processed.income : [],
                        totalExpenses: aiResult.processed?.totalExpenses || 0,
                        totalIncome: aiResult.processed?.totalIncome || 0,
                        netCashflow: aiResult.processed?.netCashflow || 0,
                        transactionCount: aiResult.processed?.transactionCount || 0,
                        vendor: 'CSV Upload',
                        vatRate: 19,
                        isOCR: false,
                        currency: '€',
                        invoiceNumber: 'CSV-' + Date.now(),
                        method: 'csv-upload',
                        aiInsights: aiResult.aiInsights,
                        alerts: Array.isArray(aiResult.alerts) ? aiResult.alerts : [],
                        highlights: Array.isArray(aiResult.highlights) ? aiResult.highlights : [],
                        cashflow: Array.isArray(aiResult.cashflow) ? aiResult.cashflow : [],
                        processed: aiResult.processed
                    });

            await accountingEntry.save();
            console.log('✅ CSV data processed and saved to database');
            
            // Add to in-memory array for testing
            accountingData.push(dataEntry);
            console.log(`📊 Added CSV data to memory. Total entries: ${accountingData.length}`);
            console.log('📊 DataEntry added:', dataEntry.id, dataEntry.filename);
            console.log('🔍 Debug dataEntry.processed:', dataEntry.processed);
            console.log('🔍 Debug dataEntry.totalExpenses:', dataEntry.totalExpenses);
            console.log('🔍 Debug dataEntry.totalIncome:', dataEntry.totalIncome);
            console.log('🔍 Debug dataEntry.netCashflow:', dataEntry.netCashflow);
            console.log('🔍 Debug aiResult.cashflow.totals:', aiResult.cashflow?.totals);
            
            // Mark as completed
            uploadProgress = {
                isActive: false,
                percentage: 100,
                message: 'CSV processing completed successfully!',
                timestamp: Date.now()
            };
            
            // Small delay to ensure data is fully processed
            await new Promise(resolve => setTimeout(resolve, 100));
                    
                    res.json({
                        success: true,
                        message: 'CSV file processed successfully',
                        data: dataEntry
                    });
                });
        } else if (fileExt === '.xlsx' || fileExt === '.xls') {
            // Excel processing
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet);
            
            console.log('Excel data parsed:', jsonData.length, 'rows');
            
            // Convert Excel to our format - preserve original dates (including serials)
            const processedData = jsonData.map(row => {
                const dateStr = normalizeDate(row.date ?? row.Date);
                return {
                    date: dateStr,
                    description: row.description || row.Description || 'Transaction',
                    amount: parseFloat(row.amount || row.Amount || 0),
                    category: row.category || row.Category || 'General',
                    vendor: row.vendor || row.Vendor || 'Unknown'
                };
            });
            
            // Process with AI
            const aiResult = await aiService.processAccountingData(processedData);
            
            // Store the processed data
            const dataEntry = {
                id: Date.now().toString(),
                filename: fileName,
                uploadDate: new Date().toISOString(),
                data: processedData,
                aiInsights: aiResult.aiInsights,
                alerts: aiResult.alerts,
                processed: aiResult.processed
            };
            
            // Add to in-memory array for testing
            accountingData.push(dataEntry);
            
            res.json({
                success: true,
                message: 'Excel file processed successfully',
                data: dataEntry
            });
        } else {
            res.status(400).json({ message: 'Unsupported file type' });
        }
        
    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ message: 'File processing failed' });
    }
});

// Process manual input data
app.post('/api/accounting/process-manual', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? (req.user._id?.toString() || req.user.userId) : 'admin';
        const manualData = req.body;

        console.log('Processing manual input for user:', userId);
        console.log('Manual data:', manualData);

        // Generate AI insights for manual data
        const aiResult = await aiService.processAccountingData(manualData, (progress, message) => {
            console.log(`Manual processing progress: ${progress}% - ${message}`);
        });

        // Create the final result
        const result = {
            ...manualData,
            aiInsights: aiResult.insights,
            alerts: aiResult.alerts,
            processed: {
                totalExpenses: manualData.totalExpenses,
                totalIncome: manualData.totalIncome,
                netCashflow: manualData.netCashflow,
                currency: manualData.currency
            }
        };

        // Save to database
        const accountingEntry = new AccountingData({
            userId: userId,
            filename: manualData.filename,
            uploadDate: new Date(manualData.uploadDate),
            expenses: manualData.expenses,
            income: manualData.income,
            totalExpenses: manualData.totalExpenses,
            totalIncome: manualData.totalIncome,
            netCashflow: manualData.netCashflow,
            transactionCount: manualData.transactionCount,
            vendor: manualData.vendor,
            vatRate: manualData.vatRate,
            isOCR: manualData.isOCR,
            currency: manualData.currency,
            invoiceNumber: manualData.invoiceNumber,
            notes: manualData.notes,
            method: manualData.method,
            aiInsights: aiResult.insights,
            alerts: aiResult.alerts,
            processed: result.processed
        });

            await accountingEntry.save();
            console.log('✅ Manual data processed and saved to database');
            
            // Create dataEntry for in-memory storage
            const dataEntry = {
                id: Date.now().toString(),
                userId: userId,
                filename: manualData.filename || 'Manual Entry',
                uploadDate: new Date().toISOString(),
                data: result,
                aiInsights: aiResult.insights,
                alerts: aiResult.alerts,
                highlights: aiResult.highlights,
                processed: result.processed || {},
                expenses: result.processed?.expenses || [],
                income: result.processed?.income || [],
                totalExpenses: result.processed?.totalExpenses || 0,
                totalIncome: result.processed?.totalIncome || 0,
                netCashflow: result.processed?.netCashflow || 0,
                transactionCount: result.processed?.transactionCount || 0
            };
            
            // Add to in-memory array for testing
            accountingData.push(dataEntry);

        res.json(result);
    } catch (error) {
        console.error('Error processing manual data:', error);
        res.status(500).json({ error: 'Failed to process manual data' });
    }
});

// Update invoice data endpoint
app.post('/api/accounting/update-invoice', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? (req.user._id?.toString() || req.user.userId) : 'admin';
        const updatedData = req.body;

        console.log('Updating invoice data for user:', userId);
        console.log('Updated data:', updatedData);

        // Find the most recent accounting entry for this user
        const latestEntry = await AccountingData.findOne({ userId })
            .sort({ uploadDate: -1 });

        if (!latestEntry) {
            return res.status(404).json({ message: 'No accounting data found to update' });
        }

        // Update the invoice data
        if (updatedData.invoiceNumber) {
            latestEntry.invoiceNumber = updatedData.invoiceNumber;
        }
        if (updatedData.date) {
            latestEntry.date = updatedData.date;
        }
        if (updatedData.currency) {
            latestEntry.currency = updatedData.currency;
        }
        if (updatedData.vendor) {
            latestEntry.vendor = updatedData.vendor;
        }
        if (updatedData.totalAmount !== undefined) {
            // Update totals if totalAmount is provided
            if (!latestEntry.totals) {
                latestEntry.totals = {};
            }
            latestEntry.totals.gross = updatedData.totalAmount;
            latestEntry.totals.total = updatedData.totalAmount;
        }
        if (updatedData.vatRate !== undefined) {
            if (!latestEntry.totals) {
                latestEntry.totals = {};
            }
            latestEntry.totals.vatRate = updatedData.vatRate;
        }
        if (updatedData.notes) {
            latestEntry.notes = updatedData.notes;
        }

        // Save the updated entry
        await latestEntry.save();

        console.log('✅ Invoice data updated successfully');

        res.json({
            success: true,
            message: 'Invoice data updated successfully',
            data: latestEntry
        });

    } catch (error) {
        console.error('Invoice update error:', error);
        res.status(500).json({ message: 'Invoice update failed' });
    }
});

// Test endpoint to check memory
app.get('/api/test-memory', (req, res) => {
    res.json({
        totalEntries: accountingData.length,
        entries: accountingData.map(e => ({ id: e.id, userId: e.userId, filename: e.filename }))
    });
});

// Progress tracking endpoints
app.get('/api/progress', (req, res) => {
    res.json(uploadProgress);
});

app.post('/api/progress/reset', (req, res) => {
    uploadProgress = {
        isActive: false,
        percentage: 0,
        message: '',
        timestamp: 0
    };
    res.json({ success: true });
});

app.post('/api/progress/update', (req, res) => {
    const { percentage, message } = req.body;
    uploadProgress = {
        isActive: true,
        percentage: percentage || 0,
        message: message || '',
        timestamp: Date.now()
    };
    res.json({ success: true });
});

// AI Accountant Advisor endpoint
app.post('/api/accounting/advisor', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }

        // Get the latest financial data for context
        const latestData = accountingData[0];
        if (!latestData) {
            return res.status(404).json({ success: false, error: 'No financial data available' });
        }

        // Initialize AI service if not already done
        if (!aiService.financialManagerInitialized) {
            await aiService.initializeFinancialManager();
        }

        // Use the accountant advisor
        const advisorResult = await aiService.financialManager.modules.accountantAdvisor.processQuery(query);

        res.json({
            success: true,
            response: advisorResult.response,
            confidence: advisorResult.confidence,
            followUpQuestions: advisorResult.followUpQuestions,
            timestamp: advisorResult.timestamp
        });

    } catch (error) {
        console.error('Advisor API error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process advisor query',
            details: error.message 
        });
    }
});

// Get accounting data
app.get('/api/accounting/data', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? (req.user._id?.toString() || req.user.userId) : 'admin';
        
        // For testing: return in-memory data instead of database
        console.log(`📊 [${new Date().toISOString()}] Total entries in memory: ${accountingData.length}`);
        console.log(`📊 [${new Date().toISOString()}] All entries:`, accountingData.map(e => ({ id: e.id, userId: e.userId, filename: e.filename })));
        // For testing: return all data regardless of user ID
        const userData = accountingData;
        console.log(`📊 [${new Date().toISOString()}] Retrieved ${userData.length} entries for user ${userId} (from memory)`);
        console.log(`📊 [${new Date().toISOString()}] User data:`, userData.map(e => ({ id: e.id, filename: e.filename })));
        
        res.json(userData);
    } catch (error) {
        console.error('Error fetching accounting data:', error);
        res.status(500).json({ message: 'Failed to fetch data' });
    }
});

// Delete uploaded file
app.delete('/api/accounting/delete/:id', optionalAuth, async (req, res) => {
    try {
        const fileId = req.params.id;
        const userId = req.user?.id || 'admin';

        console.log(`🗑️ Delete request for file ID: ${fileId}, user: ${userId}`);

        // Find and remove the file from memory
        const fileIndex = accountingData.findIndex(entry => entry.id === fileId);
        
        if (fileIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'File not found' 
            });
        }

        const deletedFile = accountingData[fileIndex];
        
        // Remove from memory array
        accountingData.splice(fileIndex, 1);

        console.log(`✅ File deleted: ${deletedFile.filename} (${deletedFile.data?.length || 0} transactions)`);

        res.json({
            success: true,
            message: 'File deleted successfully',
            deletedFile: {
                id: deletedFile.id,
                filename: deletedFile.filename,
                transactionCount: deletedFile.data?.length || 0
            }
        });

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete file' 
        });
    }
});

// Development-only: preload sample_data.csv into memory so the UI always has data
app.post('/api/dev/preload', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ message: 'Not available in production' });
        }

        const samplePath = path.join(__dirname, 'sample_data.csv');
        if (!fs.existsSync(samplePath)) {
            return res.status(404).json({ message: 'sample_data.csv not found' });
        }

        // Parse CSV quickly using xlsx for simplicity
        const wb = xlsx.readFile(samplePath, { type: 'file' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(sheet);

        const processedData = json.map(row => {
            const dateStr = normalizeDate(row.Date ?? row.date);
            return {
                date: dateStr,
                description: row.Description || row.description || 'Transaction',
                amount: parseFloat(row.Amount || row.amount || 0),
                category: row.Category || row.category || 'General',
                vendor: row.Vendor || row.vendor || 'Unknown'
            };
        });

        console.log('📊 Preload: Sample dates from CSV:', processedData.slice(0, 5).map(row => ({ date: row.date, description: row.description })));
        
        const expenses = processedData.filter(r => r.amount < 0);
        const income = processedData.filter(r => r.amount > 0);
        const totalExpenses = Math.abs(expenses.reduce((s, r) => s + r.amount, 0));
        const totalIncome = income.reduce((s, r) => s + r.amount, 0);
        const netCashflow = totalIncome - totalExpenses;

        const aiInput = {
            lineItems: processedData.map(row => ({
                description: row.description,
                total: row.amount,
                quantity: 1,
                unit_price: row.amount,
                date: row.date
            })),
            totals: { totalIncome, totalExpenses, netCashflow, net: 0, vat: 0, gross: 0 },
            currency: '€',
            date: new Date().toISOString().split('T')[0]
        };

        const aiResult = await aiService.processAccountingDataComprehensive(aiInput);
        aiResult.cashflow = aiResult.cashflow || {};
        aiResult.cashflow.totals = {
            totalExpenses,
            totalIncome,
            netCashflow,
            transactionCount: processedData.length
        };
        aiResult.cashflow.transactions = processedData;

        const dataEntry = {
            id: Date.now().toString(),
            userId: 'admin',
            filename: 'sample_data.csv',
            uploadDate: new Date().toISOString(),
            data: processedData,
            aiInsights: aiResult.aiInsights,
            alerts: Array.isArray(aiResult.alerts) ? aiResult.alerts : [],
            highlights: Array.isArray(aiResult.highlights) ? aiResult.highlights : [],
            cashflow: aiResult.cashflow || {},
            processed: {
                totalExpenses: aiResult.cashflow?.totals?.totalOutflow || 0,
                totalIncome: aiResult.cashflow?.totals?.totalInflow || 0,
                netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
                transactionCount: aiResult.cashflow?.totals?.transactionCount || 0,
                expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
                income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || []
            },
            expenses: aiResult.cashflow?.transactions?.filter(t => t.amount < 0) || [],
            income: aiResult.cashflow?.transactions?.filter(t => t.amount > 0) || [],
            totalExpenses: aiResult.cashflow?.totals?.totalExpenses || 0,
            totalIncome: aiResult.cashflow?.totals?.totalIncome || 0,
            netCashflow: aiResult.cashflow?.totals?.netCashflow || 0,
            assetsLiabilities: aiResult.assetsLiabilities || null,
            debtsLoans: aiResult.debtsLoans || null,
            taxesVAT: aiResult.taxesVAT || null,
            budget: aiResult.budget || null,
            forecasting: aiResult.forecasting || null,
            multiCurrency: aiResult.multiCurrency || null,
            report: aiResult.report || null,
            balanceSheet: aiResult.balanceSheet || null,
            profitLoss: aiResult.profitLoss || null,
            ledgerAccounts: aiResult.ledgerAccounts || null,
            transactionCount: aiResult.cashflow?.totals?.transactionCount || 0
        };

        // Replace in-memory data safely without reassigning the const
        accountingData.splice(0, accountingData.length, dataEntry);
        console.log('✅ Dev preload complete. Entries in memory:', accountingData.length);
        res.json({ success: true, count: accountingData.length, id: dataEntry.id });
    } catch (err) {
        console.error('Dev preload failed:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Generate PDF report
app.get('/api/accounting/generate-pdf/:id', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? (req.user._id?.toString() || req.user.userId) : 'admin';
        const dataId = req.params.id;
        // Query database instead of using in-memory data
        const dataEntry = await AccountingData.findOne({ _id: dataId, userId: userId });
        
        if (!dataEntry) {
            return res.status(404).json({ message: 'Data not found' });
        }
        
        // Generate text report
        let report = `ACCOUNTING REPORT\n`;
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `File: ${dataEntry.filename}\n`;
        report += `Upload Date: ${dataEntry.uploadDate}\n\n`;
        
        if (dataEntry.data) {
            report += `TRANSACTIONS:\n`;
            dataEntry.data.forEach((transaction, index) => {
                report += `${index + 1}. ${transaction.description} - $${transaction.amount} (${transaction.category})\n`;
            });
        }
        
        if (dataEntry.expenses) {
            report += `\nEXPENSES:\n`;
            dataEntry.expenses.forEach((expense, index) => {
                report += `${index + 1}. ${expense.description} - $${Math.abs(expense.amount)} (${expense.category})\n`;
            });
        }
        
        if (dataEntry.income) {
            report += `\nINCOME:\n`;
            dataEntry.income.forEach((income, index) => {
                report += `${index + 1}. ${income.description} - $${income.amount} (${income.category})\n`;
            });
        }
        
        if (dataEntry.aiInsights) {
            report += `\nAI INSIGHTS:\n`;
            report += `Business Type: ${dataEntry.aiInsights.businessType || 'Unknown'}\n`;
            report += `Financial Health: ${dataEntry.aiInsights.financialHealth || 'Unknown'}\n`;
            report += `Confidence: ${dataEntry.aiInsights.confidence || 0}%\n`;
            report += `Recommendations: ${dataEntry.aiInsights.recommendations || 'None'}\n`;
            report += `Risk Factors: ${dataEntry.aiInsights.riskFactors || 'None'}\n`;
        }
        
        if (dataEntry.alerts && dataEntry.alerts.length > 0) {
            report += `\nALERTS:\n`;
            dataEntry.alerts.forEach((alert, index) => {
                report += `${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}\n`;
            });
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="accounting-report.txt"');
        res.send(report);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
});

// Admin routes
app.get('/api/admin/dashboard', getUserFromToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    try {
        const totalUsers = await User.countDocuments();
        const totalContacts = await Contact.countDocuments();
        const totalDataEntries = Object.values(accountingData).flat().length;
        
        res.json({
            totalUsers,
            totalContacts,
            totalDataEntries,
            recentContacts: await Contact.find().sort({ createdAt: -1 }).limit(5)
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Failed to load dashboard data' });
    }
});

app.get('/api/admin/users', getUserFromToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to load users' });
    }
});

app.get('/api/admin/contacts', getUserFromToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ message: 'Failed to load contacts' });
    }
});

app.delete('/api/admin/contacts/:id', getUserFromToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ message: 'Failed to delete contact' });
    }
});

app.post('/api/admin/create-user', getUserFromToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    try {
        const { email, password, firstName, lastName, company } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const user = new User({
            email,
            password,
            firstName,
            lastName,
            company,
            role: 'user',
            isActive: true
        });
        
        await user.save();
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Admin login: ${config.ADMIN_EMAIL} / ${config.ADMIN_PASSWORD}`);
});
