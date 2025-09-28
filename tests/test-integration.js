/**
 * End-to-End Integration Tests
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

describe('End-to-End Integration Tests', () => {
    const baseUrl = 'http://localhost:3000';
    let serverProcess;

    beforeAll(async () => {
        // Start server for testing
        const { spawn } = require('child_process');
        serverProcess = spawn('node', ['server.js'], {
            stdio: 'pipe',
            cwd: process.cwd()
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
    });

    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    describe('CSV Upload and Processing', () => {
        test('should process CSV file and return valid results', async () => {
            // Create test CSV data
            const csvData = 'description,amount\nOffice Supplies,-150\nClient Payment,1000';
            const csvPath = path.join(__dirname, 'test-data.csv');
            fs.writeFileSync(csvPath, csvData);

            try {
                const form = new FormData();
                form.append('file', fs.createReadStream(csvPath));

                const response = await fetch(`${baseUrl}/api/accounting/upload`, {
                    method: 'POST',
                    body: form,
                    headers: {
                        'Authorization': 'Bearer admin-token'
                    }
                });

                expect(response.ok).toBe(true);
                
                const result = await response.json();
                expect(result.success).toBe(true);
                expect(result.data.processed.totalIncome).toBe(1000);
                expect(result.data.processed.totalExpenses).toBe(150);
                expect(result.data.processed.netCashflow).toBe(850);
            } finally {
                // Clean up
                if (fs.existsSync(csvPath)) {
                    fs.unlinkSync(csvPath);
                }
            }
        });

        test('should handle invalid CSV gracefully', async () => {
            const invalidCsvData = 'invalid,csv,data\nwith,no,proper,format';
            const csvPath = path.join(__dirname, 'invalid-test-data.csv');
            fs.writeFileSync(csvPath, invalidCsvData);

            try {
                const form = new FormData();
                form.append('file', fs.createReadStream(csvPath));

                const response = await fetch(`${baseUrl}/api/accounting/upload`, {
                    method: 'POST',
                    body: form,
                    headers: {
                        'Authorization': 'Bearer admin-token'
                    }
                });

                // Should still return a response, even if data is invalid
                expect(response.ok).toBe(true);
                
                const result = await response.json();
                expect(result).toBeDefined();
            } finally {
                if (fs.existsSync(csvPath)) {
                    fs.unlinkSync(csvPath);
                }
            }
        });
    });

    describe('Data Retrieval', () => {
        test('should retrieve user data', async () => {
            const response = await fetch(`${baseUrl}/api/accounting/data`, {
                headers: {
                    'Authorization': 'Bearer admin-token'
                }
            });

            expect(response.ok).toBe(true);
            
            const result = await response.json();
            expect(result).toBeDefined();
            expect(Array.isArray(result.entries)).toBe(true);
        });
    });

    describe('Manual Data Entry', () => {
        test('should process manual data entry', async () => {
            const manualData = {
                description: 'Test Transaction',
                amount: 500,
                type: 'income',
                category: 'Other'
            };

            const response = await fetch(`${baseUrl}/api/accounting/process-manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer admin-token'
                },
                body: JSON.stringify(manualData)
            });

            expect(response.ok).toBe(true);
            
            const result = await response.json();
            expect(result.success).toBe(true);
            expect(result.data.processed.totalIncome).toBe(500);
        });
    });

    describe('Error Handling', () => {
        test('should handle unauthorized requests', async () => {
            const response = await fetch(`${baseUrl}/api/accounting/data`);
            
            expect(response.status).toBe(401);
        });

        test('should handle invalid file uploads', async () => {
            const form = new FormData();
            form.append('file', 'not-a-file');

            const response = await fetch(`${baseUrl}/api/accounting/upload`, {
                method: 'POST',
                body: form,
                headers: {
                    'Authorization': 'Bearer admin-token'
                }
            });

            expect(response.status).toBe(400);
        });
    });
});














