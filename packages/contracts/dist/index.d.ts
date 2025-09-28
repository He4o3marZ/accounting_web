import { z } from 'zod';
export declare const JobPayloadSchema: z.ZodObject<{
    jobId: z.ZodString;
    s3Key: z.ZodString;
    mime: z.ZodString;
    originalName: z.ZodString;
    userId: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    s3Key: string;
    mime: string;
    originalName: string;
    userId: string;
    createdAt: string;
}, {
    jobId: string;
    s3Key: string;
    mime: string;
    originalName: string;
    userId: string;
    createdAt: string;
}>;
export type JobPayload = z.infer<typeof JobPayloadSchema>;
export declare const TransactionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    description: z.ZodString;
    vendor: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    category: z.ZodOptional<z.ZodString>;
    taxAmount: z.ZodOptional<z.ZodNumber>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    description: string;
    amount: number;
    currency: string;
    id?: string | undefined;
    vendor?: string | undefined;
    category?: string | undefined;
    taxAmount?: number | undefined;
    meta?: Record<string, any> | undefined;
}, {
    date: string;
    description: string;
    amount: number;
    id?: string | undefined;
    vendor?: string | undefined;
    currency?: string | undefined;
    category?: string | undefined;
    taxAmount?: number | undefined;
    meta?: Record<string, any> | undefined;
}>;
export type Transaction = z.infer<typeof TransactionSchema>;
export declare const JobResultSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["completed", "failed"]>;
    transactions: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        date: z.ZodString;
        description: z.ZodString;
        vendor: z.ZodOptional<z.ZodString>;
        amount: z.ZodNumber;
        currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        category: z.ZodOptional<z.ZodString>;
        taxAmount: z.ZodOptional<z.ZodNumber>;
        meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        date: string;
        description: string;
        amount: number;
        currency: string;
        id?: string | undefined;
        vendor?: string | undefined;
        category?: string | undefined;
        taxAmount?: number | undefined;
        meta?: Record<string, any> | undefined;
    }, {
        date: string;
        description: string;
        amount: number;
        id?: string | undefined;
        vendor?: string | undefined;
        currency?: string | undefined;
        category?: string | undefined;
        taxAmount?: number | undefined;
        meta?: Record<string, any> | undefined;
    }>, "many">;
    summary: z.ZodObject<{
        totalsByCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
        total: z.ZodNumber;
        totalIncome: z.ZodNumber;
        totalExpenses: z.ZodNumber;
        netCashflow: z.ZodNumber;
        transactionCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalsByCategory: Record<string, number>;
        total: number;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
    }, {
        totalsByCategory: Record<string, number>;
        total: number;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
    }>;
    metadata: z.ZodObject<{
        processingTime: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
        method: z.ZodString;
        errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        processingTime: number;
        method: string;
        confidence?: number | undefined;
        errors?: string[] | undefined;
    }, {
        processingTime: number;
        method: string;
        confidence?: number | undefined;
        errors?: string[] | undefined;
    }>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    createdAt: string;
    status: "completed" | "failed";
    transactions: {
        date: string;
        description: string;
        amount: number;
        currency: string;
        id?: string | undefined;
        vendor?: string | undefined;
        category?: string | undefined;
        taxAmount?: number | undefined;
        meta?: Record<string, any> | undefined;
    }[];
    summary: {
        totalsByCategory: Record<string, number>;
        total: number;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
    };
    metadata: {
        processingTime: number;
        method: string;
        confidence?: number | undefined;
        errors?: string[] | undefined;
    };
}, {
    jobId: string;
    createdAt: string;
    status: "completed" | "failed";
    transactions: {
        date: string;
        description: string;
        amount: number;
        id?: string | undefined;
        vendor?: string | undefined;
        currency?: string | undefined;
        category?: string | undefined;
        taxAmount?: number | undefined;
        meta?: Record<string, any> | undefined;
    }[];
    summary: {
        totalsByCategory: Record<string, number>;
        total: number;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
    };
    metadata: {
        processingTime: number;
        method: string;
        confidence?: number | undefined;
        errors?: string[] | undefined;
    };
}>;
export type JobResult = z.infer<typeof JobResultSchema>;
export declare const FileUploadResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    jobId: z.ZodString;
    data: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        filename: z.ZodString;
        uploadDate: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        filename: string;
        uploadDate: string;
    }, {
        id: string;
        filename: string;
        uploadDate: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    message: string;
    success: boolean;
    data?: {
        id: string;
        filename: string;
        uploadDate: string;
    } | undefined;
}, {
    jobId: string;
    message: string;
    success: boolean;
    data?: {
        id: string;
        filename: string;
        uploadDate: string;
    } | undefined;
}>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export declare const StatusResponseSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["queued", "active", "completed", "failed"]>;
    progress: z.ZodNumber;
    message: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    result: z.ZodOptional<z.ZodObject<{
        jobId: z.ZodString;
        status: z.ZodEnum<["completed", "failed"]>;
        transactions: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        summary: z.ZodObject<{
            totalsByCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
            total: z.ZodNumber;
            totalIncome: z.ZodNumber;
            totalExpenses: z.ZodNumber;
            netCashflow: z.ZodNumber;
            transactionCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        }, {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        }>;
        metadata: z.ZodObject<{
            processingTime: z.ZodNumber;
            confidence: z.ZodOptional<z.ZodNumber>;
            method: z.ZodString;
            errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        }, {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        }>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    }, {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    createdAt: string;
    message: string;
    status: "completed" | "failed" | "queued" | "active";
    progress: number;
    updatedAt: string;
    result?: {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    } | undefined;
}, {
    jobId: string;
    createdAt: string;
    message: string;
    status: "completed" | "failed" | "queued" | "active";
    progress: number;
    updatedAt: string;
    result?: {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    } | undefined;
}>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export declare const ResultsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        filename: z.ZodString;
        uploadDate: z.ZodString;
        expenses: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        income: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        totalExpenses: z.ZodNumber;
        totalIncome: z.ZodNumber;
        netCashflow: z.ZodNumber;
        transactionCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    }, {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    };
}, {
    success: boolean;
    data: {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    };
}>;
export type ResultsResponse = z.infer<typeof ResultsResponseSchema>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: string;
    message?: string | undefined;
    details?: any;
}, {
    success: false;
    error: string;
    message?: string | undefined;
    details?: any;
}>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export declare const ApiResponseSchema: z.ZodUnion<[z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    jobId: z.ZodString;
    data: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        filename: z.ZodString;
        uploadDate: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        filename: string;
        uploadDate: string;
    }, {
        id: string;
        filename: string;
        uploadDate: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    message: string;
    success: boolean;
    data?: {
        id: string;
        filename: string;
        uploadDate: string;
    } | undefined;
}, {
    jobId: string;
    message: string;
    success: boolean;
    data?: {
        id: string;
        filename: string;
        uploadDate: string;
    } | undefined;
}>, z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["queued", "active", "completed", "failed"]>;
    progress: z.ZodNumber;
    message: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    result: z.ZodOptional<z.ZodObject<{
        jobId: z.ZodString;
        status: z.ZodEnum<["completed", "failed"]>;
        transactions: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        summary: z.ZodObject<{
            totalsByCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
            total: z.ZodNumber;
            totalIncome: z.ZodNumber;
            totalExpenses: z.ZodNumber;
            netCashflow: z.ZodNumber;
            transactionCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        }, {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        }>;
        metadata: z.ZodObject<{
            processingTime: z.ZodNumber;
            confidence: z.ZodOptional<z.ZodNumber>;
            method: z.ZodString;
            errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        }, {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        }>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    }, {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    createdAt: string;
    message: string;
    status: "completed" | "failed" | "queued" | "active";
    progress: number;
    updatedAt: string;
    result?: {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    } | undefined;
}, {
    jobId: string;
    createdAt: string;
    message: string;
    status: "completed" | "failed" | "queued" | "active";
    progress: number;
    updatedAt: string;
    result?: {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    } | undefined;
}>, z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        filename: z.ZodString;
        uploadDate: z.ZodString;
        expenses: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        income: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        totalExpenses: z.ZodNumber;
        totalIncome: z.ZodNumber;
        netCashflow: z.ZodNumber;
        transactionCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    }, {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data: {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    };
}, {
    success: boolean;
    data: {
        id: string;
        totalIncome: number;
        totalExpenses: number;
        netCashflow: number;
        transactionCount: number;
        filename: string;
        uploadDate: string;
        expenses: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        income: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
    };
}>, z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    success: false;
    error: string;
    message?: string | undefined;
    details?: any;
}, {
    success: false;
    error: string;
    message?: string | undefined;
    details?: any;
}>]>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export declare const PythonWorkerRequestSchema: z.ZodObject<{
    jobId: z.ZodString;
    s3Key: z.ZodString;
    mime: z.ZodString;
    originalName: z.ZodString;
    userId: z.ZodString;
    callbackUrl: z.ZodString;
    apiKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    s3Key: string;
    mime: string;
    originalName: string;
    userId: string;
    callbackUrl: string;
    apiKey: string;
}, {
    jobId: string;
    s3Key: string;
    mime: string;
    originalName: string;
    userId: string;
    callbackUrl: string;
    apiKey: string;
}>;
export type PythonWorkerRequest = z.infer<typeof PythonWorkerRequestSchema>;
export declare const PythonWorkerResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    jobId: z.ZodString;
    result: z.ZodOptional<z.ZodObject<{
        jobId: z.ZodString;
        status: z.ZodEnum<["completed", "failed"]>;
        transactions: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            date: z.ZodString;
            description: z.ZodString;
            vendor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            currency: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            category: z.ZodOptional<z.ZodString>;
            taxAmount: z.ZodOptional<z.ZodNumber>;
            meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }, {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }>, "many">;
        summary: z.ZodObject<{
            totalsByCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
            total: z.ZodNumber;
            totalIncome: z.ZodNumber;
            totalExpenses: z.ZodNumber;
            netCashflow: z.ZodNumber;
            transactionCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        }, {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        }>;
        metadata: z.ZodObject<{
            processingTime: z.ZodNumber;
            confidence: z.ZodOptional<z.ZodNumber>;
            method: z.ZodString;
            errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        }, {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        }>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    }, {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    }>>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    success: boolean;
    result?: {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            currency: string;
            id?: string | undefined;
            vendor?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    } | undefined;
    error?: string | undefined;
}, {
    jobId: string;
    success: boolean;
    result?: {
        jobId: string;
        createdAt: string;
        status: "completed" | "failed";
        transactions: {
            date: string;
            description: string;
            amount: number;
            id?: string | undefined;
            vendor?: string | undefined;
            currency?: string | undefined;
            category?: string | undefined;
            taxAmount?: number | undefined;
            meta?: Record<string, any> | undefined;
        }[];
        summary: {
            totalsByCategory: Record<string, number>;
            total: number;
            totalIncome: number;
            totalExpenses: number;
            netCashflow: number;
            transactionCount: number;
        };
        metadata: {
            processingTime: number;
            method: string;
            confidence?: number | undefined;
            errors?: string[] | undefined;
        };
    } | undefined;
    error?: string | undefined;
}>;
export type PythonWorkerResponse = z.infer<typeof PythonWorkerResponseSchema>;
//# sourceMappingURL=index.d.ts.map