#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting JoAutomation Server...\n');

// Check if we should use TypeScript or JavaScript server
const useTypeScript = process.argv.includes('--ts') || process.argv.includes('--typescript');

if (useTypeScript) {
    console.log('📝 Starting TypeScript server (src/server.ts)...');
    console.log('✅ Auth routes are now enabled!\n');
    
    const tsx = spawn('npx', ['tsx', 'src/server.ts'], {
        stdio: 'inherit',
        shell: true
    });
    
    tsx.on('error', (err) => {
        console.error('❌ Error starting TypeScript server:', err);
        process.exit(1);
    });
    
    tsx.on('close', (code) => {
        console.log(`\n📝 TypeScript server exited with code ${code}`);
        process.exit(code);
    });
} else {
    console.log('📄 Starting JavaScript server (server.js)...');
    console.log('✅ Auth routes are available!\n');
    
    const node = spawn('node', ['server.js'], {
        stdio: 'inherit',
        shell: true
    });
    
    node.on('error', (err) => {
        console.error('❌ Error starting JavaScript server:', err);
        process.exit(1);
    });
    
    node.on('close', (code) => {
        console.log(`\n📄 JavaScript server exited with code ${code}`);
        process.exit(code);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
