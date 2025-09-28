import request from 'supertest';
import path from 'path';
import fs from 'fs';

// Import our server setup
import app from '../src/server';

describe('E2E Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start the server for testing
    server = app.listen(0); // Use port 0 to get a random available port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    it('should return 200 for root endpoint', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should return 200 for dashboard endpoint', async () => {
      const response = await request(app).get('/dashboard');
      expect(response.status).toBe(200);
    });
  });

  describe('API Endpoints', () => {
    it('should return 404 for non-existent API endpoint', async () => {
      const response = await request(app).get('/api/non-existent');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not found');
    });

    it('should handle file upload validation', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test content'), 'test.txt');

      // Should fail because .txt is not an allowed file type
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle status check for non-existent job', async () => {
      const response = await request(app).get('/api/status/non-existent-job');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('should handle results check for non-existent job', async () => {
      const response = await request(app).get('/api/results/non-existent-job');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('Internal API', () => {
    it('should reject internal ingest without API key', async () => {
      const response = await request(app)
        .post('/internal/ingest/test-job')
        .send({
          jobId: 'test-job',
          status: 'completed',
          transactions: [],
          summary: {
            totalsByCategory: {},
            total: 0.0,
            totalIncome: 0.0,
            totalExpenses: 0.0,
            netCashflow: 0.0,
            transactionCount: 0,
          },
          metadata: {},
          createdAt: new Date().toISOString(),
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject internal ingest with invalid API key', async () => {
      const response = await request(app)
        .post('/internal/ingest/test-job')
        .set('X-API-Key', 'invalid-key')
        .send({
          jobId: 'test-job',
          status: 'completed',
          transactions: [],
          summary: {
            totalsByCategory: {},
            total: 0.0,
            totalIncome: 0.0,
            totalExpenses: 0.0,
            netCashflow: 0.0,
            transactionCount: 0,
          },
          metadata: {},
          createdAt: new Date().toISOString(),
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields in internal ingest', async () => {
      const response = await request(app)
        .post('/internal/ingest/test-job')
        .set('X-API-Key', 'dev-key')
        .send({
          // Missing required fields
          jobId: 'test-job',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('Static File Serving', () => {
    it('should serve static files from public directory', async () => {
      // Test if the dashboard.html file exists and can be served
      const dashboardPath = path.join(__dirname, '../public/dashboard.html');
      if (fs.existsSync(dashboardPath)) {
        const response = await request(app).get('/dashboard');
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/html/);
      }
    });
  });
});
