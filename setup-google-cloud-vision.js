#!/usr/bin/env node

/**
 * Google Cloud Vision Setup Script
 * Configures Google Cloud Vision API for OCR processing
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupGoogleCloudVision() {
    console.log('🌐 Google Cloud Vision OCR Setup');
    console.log('================================\n');
    
    console.log('This script will help you set up Google Cloud Vision API for OCR processing.');
    console.log('Google Cloud Vision provides excellent Arabic text recognition and handles complex PDFs.\n');
    
    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        console.log('✅ Found existing .env file');
    } else {
        console.log('📝 Creating new .env file');
    }
    
    console.log('\n📋 Setup Options:');
    console.log('1. Service Account Key (Recommended for production)');
    console.log('2. API Key (Simpler setup, good for development)');
    console.log('3. Skip setup (use existing configuration)\n');
    
    const setupChoice = await question('Choose setup method (1-3): ');
    
    if (setupChoice === '3') {
        console.log('✅ Skipping setup. Using existing configuration.');
        rl.close();
        return;
    }
    
    if (setupChoice === '1') {
        await setupServiceAccount(envContent, envPath);
    } else if (setupChoice === '2') {
        await setupAPIKey(envContent, envPath);
    } else {
        console.log('❌ Invalid choice. Exiting.');
        rl.close();
        return;
    }
    
    console.log('\n🎉 Google Cloud Vision setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your application: npm start');
    console.log('2. Test with a PDF file to verify OCR is working');
    console.log('3. Check the logs for "Google Cloud Vision" messages\n');
    
    rl.close();
}

async function setupServiceAccount(envContent, envPath) {
    console.log('\n🔑 Service Account Setup');
    console.log('========================\n');
    
    console.log('To use Service Account authentication:');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable the Vision API');
    console.log('4. Create a Service Account');
    console.log('5. Download the JSON key file\n');
    
    const projectId = await question('Enter your Google Cloud Project ID: ');
    const keyFilePath = await question('Enter path to your service account JSON key file: ');
    
    if (!fs.existsSync(keyFilePath)) {
        console.log('❌ Key file not found. Please check the path.');
        return;
    }
    
    // Update .env file
    const newEnvContent = updateEnvFile(envContent, {
        'GOOGLE_CLOUD_PROJECT_ID': projectId,
        'GOOGLE_APPLICATION_CREDENTIALS': keyFilePath
    });
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ Service Account configuration saved to .env');
}

async function setupAPIKey(envContent, envPath) {
    console.log('\n🔑 API Key Setup');
    console.log('================\n');
    
    console.log('To get an API key:');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable the Vision API');
    console.log('4. Go to "Credentials" and create an API key');
    console.log('5. Restrict the API key to Vision API only\n');
    
    const apiKey = await question('Enter your Google Cloud Vision API key: ');
    
    if (!apiKey || apiKey.length < 20) {
        console.log('❌ Invalid API key. Please check and try again.');
        return;
    }
    
    // Update .env file
    const newEnvContent = updateEnvFile(envContent, {
        'GOOGLE_VISION_KEY': apiKey
    });
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ API key configuration saved to .env');
}

function updateEnvFile(content, newVars) {
    let lines = content.split('\n');
    
    // Remove existing Google Cloud variables
    lines = lines.filter(line => 
        !line.startsWith('GOOGLE_CLOUD_PROJECT_ID=') &&
        !line.startsWith('GOOGLE_APPLICATION_CREDENTIALS=') &&
        !line.startsWith('GOOGLE_VISION_KEY=')
    );
    
    // Add new variables
    Object.entries(newVars).forEach(([key, value]) => {
        lines.push(`${key}=${value}`);
    });
    
    return lines.join('\n');
}

// Test Google Cloud Vision connection
async function testConnection() {
    console.log('\n🧪 Testing Google Cloud Vision connection...');
    
    try {
        const GoogleCloudVisionService = require('./services/googleCloudVision');
        const gcpService = new GoogleCloudVisionService();
        
        const isConnected = await gcpService.testConnection();
        
        if (isConnected) {
            console.log('✅ Google Cloud Vision connection successful!');
        } else {
            console.log('❌ Google Cloud Vision connection failed. Check your credentials.');
        }
    } catch (error) {
        console.log('❌ Error testing connection:', error.message);
    }
}

// Run setup
if (require.main === module) {
    setupGoogleCloudVision()
        .then(() => {
            console.log('\n🔧 Would you like to test the connection now? (y/n)');
            return question('');
        })
        .then((testChoice) => {
            if (testChoice.toLowerCase() === 'y' || testChoice.toLowerCase() === 'yes') {
                return testConnection();
            }
        })
        .catch(console.error);
}

module.exports = { setupGoogleCloudVision, testConnection };







