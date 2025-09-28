const mongoose = require('mongoose');

const accountingDataSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    expenses: [{
        description: String,
        amount: Number,
        category: String
    }],
    income: [{
        description: String,
        amount: Number,
        source: String
    }],
    totalExpenses: {
        type: Number,
        default: 0
    },
    totalIncome: {
        type: Number,
        default: 0
    },
    netCashflow: {
        type: Number,
        default: 0
    },
    transactionCount: {
        type: Number,
        default: 0
    },
    vendor: String,
    vatRate: {
        type: Number,
        default: 19
    },
    isOCR: {
        type: Boolean,
        default: false
    },
    currency: {
        type: String,
        default: '€'
    },
    invoiceNumber: String,
    notes: String,
    method: String,
    aiInsights: {
        businessType: String,
        spendingPatterns: String,
        financialHealth: String,
        recommendations: [String],
        riskFactors: [String],
        confidence: Number
    },
    alerts: [mongoose.Schema.Types.Mixed],
    highlights: [mongoose.Schema.Types.Mixed],
    cashflow: [{
        date: Date,
        inflow: Number,
        outflow: Number,
        netFlow: Number,
        currency: String
    }],
    processed: {
        totalExpenses: Number,
        totalIncome: Number,
        netCashflow: Number,
        currency: String
    },
    lineItems: [{
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number
    }],
    totals: {
        net: Number,
        vat: Number,
        vatRate: Number,
        gross: Number
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'error'],
        default: 'completed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AccountingData', accountingDataSchema);
