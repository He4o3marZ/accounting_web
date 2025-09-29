# JoAutomation Migration: Express → TypeScript + Python

This document outlines the migration from the original Express.js application to a modern TypeScript + Python architecture.

## 🏗️ New Architecture

```
accounting_web/
├── src/                          # TypeScript API server
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic
│   ├── models/                   # Database models
│   ├── types/                    # TypeScript types
│   ├── middleware/               # Express middleware
│   └── server.ts                 # Main server file
├── apps/
│   └── worker-py/                # Python worker for complex parsing
│       ├── main.py              # FastAPI worker
│       └── requirements.txt     # Python dependencies
├── packages/
│   └── contracts/               # Shared schemas (TypeScript ↔ Python)
│       ├── src/                 # Zod schemas
│       └── schemas/             # Generated JSON schemas
├── prisma/                      # Database schema and migrations
├── public/                      # Frontend files (unchanged)
└── server.js                    # Legacy server (for comparison)
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python worker dependencies
npm run worker:install

# Generate Prisma client
npm run db:generate
```

### 2. Environment Setup

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` - S3 configuration
- `WORKER_URL` - Python worker URL (default: http://localhost:8000)
- `INTERNAL_API_KEY` - API key for internal communication

### 3. Database Setup

```bash
# Run database migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Start Services

```bash
# Terminal 1: Start TypeScript API server
npm run dev

# Terminal 2: Start Python worker
npm run worker:start

# Terminal 3: (Optional) Start legacy server for comparison
npm run legacy:start
```

## 📊 API Endpoints

### New TypeScript API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload file for processing |
| `GET` | `/api/status/:id` | Get job status |
| `GET` | `/api/results/:id` | Get processing results |
| `POST` | `/internal/ingest/:id` | Internal: Ingest Python worker results |

### Legacy Endpoints (Maintained)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/accounting/upload` | Legacy upload endpoint |
| `GET` | `/api/accounting/data` | Legacy data retrieval |
| `POST` | `/api/auth/login` | Authentication |
| `POST` | `/api/contact` | Contact form |

## 🔄 Processing Flow

### TypeScript Path (Simple Files)
1. File uploaded → S3 storage
2. TypeScript parser processes CSV/simple PDF
3. Results stored in PostgreSQL
4. Response returned immediately

### Python Path (Complex Files)
1. File uploaded → S3 storage
2. Job queued in Redis
3. Python worker downloads from S3
4. Python processes with OCR/advanced parsing
5. Results sent back via callback
6. Results stored in PostgreSQL

## 🐍 Python Worker Features

- **CSV Parsing**: pandas-based with date/amount normalization
- **PDF Parsing**: pdfplumber + camelot + tabula for tables
- **OCR Processing**: OpenCV + Tesseract for images
- **S3 Integration**: Automatic file download/upload
- **Error Handling**: Comprehensive error reporting
- **Callback System**: Results sent back to TypeScript API

## 🗄️ Database Schema

### Files Table
- `id`, `userId`, `filename`, `originalName`, `mime`, `s3Key`
- `status` (pending/processing/completed/failed)
- `result` (JSON with processing results)

### Transactions Table  
- `id`, `fileId`, `userId`, `date`, `description`, `vendor`
- `amount`, `currency`, `category`, `taxAmount`, `meta`

## 🧪 Testing

```bash
# Run TypeScript tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📦 Deployment

### Development
```bash
npm run dev          # TypeScript server
npm run worker:start # Python worker
```

### Production
```bash
npm run build        # Compile TypeScript
npm start           # Start compiled server
# Python worker runs as separate service
```

## 🔧 Configuration

### TypeScript Configuration
- `tsconfig.json` - Strict TypeScript settings
- Path mapping: `@/*` → `src/*`
- Target: ES2020, Module: CommonJS

### Prisma Configuration
- `prisma/schema.prisma` - Database schema
- PostgreSQL provider
- Generated client in `node_modules/@prisma/client`

### Python Configuration
- `apps/worker-py/requirements.txt` - Dependencies
- FastAPI framework
- Async processing with callbacks

## 🚨 Breaking Changes

### What Changed
- **Database**: MongoDB → PostgreSQL + Prisma
- **Storage**: Local files → S3
- **Processing**: Synchronous → Asynchronous with queues
- **Language**: JavaScript → TypeScript + Python

### What Stayed the Same
- **Frontend**: HTML/CSS/JS unchanged
- **API Contracts**: Upload/status/results endpoints maintained
- **Authentication**: JWT-based auth preserved
- **File Types**: Same supported formats

## 🔄 Migration Strategy

### Phase 1: Parallel Running
- New TypeScript API runs alongside legacy server
- Gradual migration of endpoints
- A/B testing with different file types

### Phase 2: Full Migration
- All traffic routed to TypeScript API
- Legacy server deprecated
- Python worker handles complex cases

### Phase 3: Optimization
- Performance tuning
- Additional Python parsers
- Enhanced error handling

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**
   ```bash
   npm run lint  # Check for type errors
   ```

2. **Database Connection Issues**
   ```bash
   npm run db:generate  # Regenerate Prisma client
   ```

3. **Python Worker Not Starting**
   ```bash
   npm run worker:install  # Install Python dependencies
   ```

4. **S3 Upload Failures**
   - Check environment variables
   - Verify S3 credentials and bucket permissions

### Logs
- TypeScript server: Console output
- Python worker: FastAPI logs
- Database: Prisma query logs (development mode)

## 📈 Performance Improvements

- **Async Processing**: Files processed in background
- **Queue System**: Redis-based job queuing
- **S3 Storage**: Scalable file storage
- **Type Safety**: Compile-time error checking
- **Database Optimization**: Prisma query optimization

## 🔐 Security

- **API Keys**: Internal communication secured
- **File Validation**: MIME type checking
- **S3 Security**: IAM-based access control
- **Database**: Parameterized queries via Prisma

## 📚 Next Steps

1. **Monitoring**: Add logging and metrics
2. **Scaling**: Horizontal scaling with multiple workers
3. **Caching**: Redis caching for frequent queries
4. **Testing**: Comprehensive E2E test suite
5. **Documentation**: API documentation with OpenAPI

---

**Note**: This migration maintains full backward compatibility while providing a modern, scalable foundation for future development.








