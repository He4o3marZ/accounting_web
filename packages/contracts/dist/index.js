"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonWorkerResponseSchema = exports.PythonWorkerRequestSchema = exports.ApiResponseSchema = exports.ErrorResponseSchema = exports.ResultsResponseSchema = exports.StatusResponseSchema = exports.FileUploadResponseSchema = exports.JobResultSchema = exports.TransactionSchema = exports.JobPayloadSchema = void 0;
const zod_1 = require("zod");
exports.JobPayloadSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    s3Key: zod_1.z.string(),
    mime: zod_1.z.string(),
    originalName: zod_1.z.string(),
    userId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
exports.TransactionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    date: zod_1.z.string().datetime(),
    description: zod_1.z.string(),
    vendor: zod_1.z.string().optional(),
    amount: zod_1.z.number(),
    currency: zod_1.z.string().optional().default('EUR'),
    category: zod_1.z.string().optional(),
    taxAmount: zod_1.z.number().optional(),
    meta: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.JobResultSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    status: zod_1.z.enum(['completed', 'failed']),
    transactions: zod_1.z.array(exports.TransactionSchema),
    summary: zod_1.z.object({
        totalsByCategory: zod_1.z.record(zod_1.z.number()),
        total: zod_1.z.number(),
        totalIncome: zod_1.z.number(),
        totalExpenses: zod_1.z.number(),
        netCashflow: zod_1.z.number(),
        transactionCount: zod_1.z.number(),
    }),
    metadata: zod_1.z.object({
        processingTime: zod_1.z.number(),
        confidence: zod_1.z.number().optional(),
        method: zod_1.z.string(),
        errors: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    createdAt: zod_1.z.string().datetime(),
});
exports.FileUploadResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    jobId: zod_1.z.string(),
    data: zod_1.z.object({
        id: zod_1.z.string(),
        filename: zod_1.z.string(),
        uploadDate: zod_1.z.string(),
    }).optional(),
});
exports.StatusResponseSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    status: zod_1.z.enum(['queued', 'active', 'completed', 'failed']),
    progress: zod_1.z.number().min(0).max(100),
    message: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    result: exports.JobResultSchema.optional(),
});
exports.ResultsResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        id: zod_1.z.string(),
        filename: zod_1.z.string(),
        uploadDate: zod_1.z.string(),
        expenses: zod_1.z.array(exports.TransactionSchema),
        income: zod_1.z.array(exports.TransactionSchema),
        totalExpenses: zod_1.z.number(),
        totalIncome: zod_1.z.number(),
        netCashflow: zod_1.z.number(),
        transactionCount: zod_1.z.number(),
    }),
});
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.string(),
    message: zod_1.z.string().optional(),
    details: zod_1.z.any().optional(),
});
exports.ApiResponseSchema = zod_1.z.union([
    exports.FileUploadResponseSchema,
    exports.StatusResponseSchema,
    exports.ResultsResponseSchema,
    exports.ErrorResponseSchema,
]);
exports.PythonWorkerRequestSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    s3Key: zod_1.z.string(),
    mime: zod_1.z.string(),
    originalName: zod_1.z.string(),
    userId: zod_1.z.string(),
    callbackUrl: zod_1.z.string().url(),
    apiKey: zod_1.z.string(),
});
exports.PythonWorkerResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    jobId: zod_1.z.string(),
    result: exports.JobResultSchema.optional(),
    error: zod_1.z.string().optional(),
});
//# sourceMappingURL=index.js.map