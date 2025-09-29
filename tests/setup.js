/**
 * Jest Setup File
 */

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock OpenAI to avoid API calls in tests
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                insights: { financialHealth: "Test health" },
                                alerts: []
                            })
                        }
                    }]
                })
            }
        }
    }));
});

// Mock file system operations
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    createReadStream: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: jest.fn()
}));

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
















