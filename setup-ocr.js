/**
 * OCR Setup Script - Configure cloud OCR APIs for automatic PDF processing
 */

const fs = require('fs');
const path = require('path');

class OCRSetup {
    constructor() {
        this.envFile = '.env';
        this.setupInstructions = {
            ocrSpace: {
                name: 'OCR.space (Free)',
                description: 'Free OCR service with 500 requests/day',
                steps: [
                    '1. Visit https://ocr.space/ocrapi/freekey',
                    '2. Register for free account',
                    '3. Get your API key',
                    '4. Run: node setup-ocr.js --key=your_key_here'
                ],
                advantages: [
                    'Free tier available',
                    'No credit card required',
                    'Supports Arabic and English',
                    'Easy setup'
                ]
            },
            azure: {
                name: 'Microsoft Azure Computer Vision',
                description: 'Professional OCR service',
                steps: [
                    '1. Create Azure account at https://azure.microsoft.com',
                    '2. Create Computer Vision resource',
                    '3. Get API key and region',
                    '4. Run: node setup-ocr.js --azure-key=your_key --azure-region=your_region'
                ],
                advantages: [
                    'Professional grade',
                    'High accuracy',
                    'Supports 100+ languages',
                    'Scalable'
                ]
            },
            google: {
                name: 'Google Cloud Vision',
                description: 'Google quality OCR service',
                steps: [
                    '1. Create Google Cloud account',
                    '2. Enable Vision API',
                    '3. Create API key',
                    '4. Run: node setup-ocr.js --google-key=your_key'
                ],
                advantages: [
                    'Google quality',
                    'Excellent text detection',
                    'Multi-language support',
                    'Reliable'
                ]
            }
        };
    }

    /**
     * Display setup instructions
     */
    showInstructions() {
        console.log('🔧 OCR Setup Instructions');
        console.log('========================\n');
        
        Object.entries(this.setupInstructions).forEach(([key, service]) => {
            console.log(`📋 ${service.name}`);
            console.log(`   ${service.description}\n`);
            
            console.log('   Steps:');
            service.steps.forEach(step => console.log(`   ${step}`));
            
            console.log('\n   Advantages:');
            service.advantages.forEach(advantage => console.log(`   • ${advantage}`));
            
            console.log('\n' + '─'.repeat(50) + '\n');
        });
        
        console.log('💡 Recommendation: Start with OCR.space (free) for testing');
        console.log('   Command: node setup-ocr.js --key=your_ocr_space_key\n');
    }

    /**
     * Configure OCR API keys
     */
    configureAPI(options) {
        console.log('🔧 Configuring OCR APIs...\n');
        
        let envContent = '';
        
        // Read existing .env file if it exists
        if (fs.existsSync(this.envFile)) {
            envContent = fs.readFileSync(this.envFile, 'utf8');
        }
        
        // Remove existing OCR configurations
        envContent = envContent.replace(/^OCR_.*$/gm, '');
        envContent = envContent.replace(/^AZURE_.*$/gm, '');
        envContent = envContent.replace(/^GOOGLE_.*$/gm, '');
        
        // Add new configurations
        if (options.key) {
            envContent += `\n# OCR.space API Key (Free tier: 500 requests/day)\n`;
            envContent += `OCR_SPACE_KEY=${options.key}\n`;
            console.log('✅ OCR.space API key configured');
        }
        
        if (options.azureKey) {
            envContent += `\n# Microsoft Azure Computer Vision\n`;
            envContent += `AZURE_VISION_KEY=${options.azureKey}\n`;
            if (options.azureRegion) {
                envContent += `AZURE_VISION_REGION=${options.azureRegion}\n`;
            }
            console.log('✅ Azure Computer Vision configured');
        }
        
        if (options.googleKey) {
            envContent += `\n# Google Cloud Vision API\n`;
            envContent += `GOOGLE_VISION_KEY=${options.googleKey}\n`;
            console.log('✅ Google Cloud Vision configured');
        }
        
        // Write .env file
        fs.writeFileSync(this.envFile, envContent.trim() + '\n');
        
        console.log('\n🎉 Configuration saved to .env file');
        console.log('🔄 Please restart your application for changes to take effect\n');
        
        // Test configuration
        this.testConfiguration();
    }

    /**
     * Test OCR configuration
     */
    async testConfiguration() {
        console.log('🧪 Testing OCR configuration...\n');
        
        try {
            // Load environment variables
            require('dotenv').config();
            
            const CloudOCRAPIService = require('./services/cloudOCRAPI');
            const ocrAPI = new CloudOCRAPIService();
            
            const results = await ocrAPI.testAPIConnectivity();
            
            console.log('📊 Test Results:');
            Object.entries(results).forEach(([service, result]) => {
                const status = result.available ? '✅ Available' : '❌ Not Available';
                console.log(`   ${service}: ${status}`);
                if (result.error) {
                    console.log(`     Error: ${result.error}`);
                }
            });
            
            if (Object.values(results).some(r => r.available)) {
                console.log('\n🎉 OCR is ready! Your customers can now upload PDFs automatically.');
            } else {
                console.log('\n⚠️ No OCR services are available. Please configure an API key.');
            }
            
        } catch (error) {
            console.log('❌ Test failed:', error.message);
        }
    }

    /**
     * Parse command line arguments
     */
    parseArgs() {
        const args = process.argv.slice(2);
        const options = {};
        
        args.forEach(arg => {
            if (arg.startsWith('--key=')) {
                options.key = arg.split('=')[1];
            } else if (arg.startsWith('--azure-key=')) {
                options.azureKey = arg.split('=')[1];
            } else if (arg.startsWith('--azure-region=')) {
                options.azureRegion = arg.split('=')[1];
            } else if (arg.startsWith('--google-key=')) {
                options.googleKey = arg.split('=')[1];
            } else if (arg === '--help' || arg === '-h') {
                this.showHelp();
                process.exit(0);
            }
        });
        
        return options;
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log('🔧 OCR Setup Script');
        console.log('==================\n');
        
        console.log('Usage:');
        console.log('  node setup-ocr.js [options]\n');
        
        console.log('Options:');
        console.log('  --key=API_KEY              Set OCR.space API key (free)');
        console.log('  --azure-key=API_KEY        Set Azure Computer Vision API key');
        console.log('  --azure-region=REGION      Set Azure region (e.g., eastus)');
        console.log('  --google-key=API_KEY       Set Google Cloud Vision API key');
        console.log('  --help, -h                 Show this help message\n');
        
        console.log('Examples:');
        console.log('  node setup-ocr.js --key=your_ocr_space_key');
        console.log('  node setup-ocr.js --azure-key=your_key --azure-region=eastus');
        console.log('  node setup-ocr.js --google-key=your_key\n');
        
        console.log('For setup instructions, run: node setup-ocr.js');
    }

    /**
     * Run the setup
     */
    async run() {
        const options = this.parseArgs();
        
        if (Object.keys(options).length === 0) {
            this.showInstructions();
        } else {
            this.configureAPI(options);
        }
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    const setup = new OCRSetup();
    setup.run().catch(console.error);
}

module.exports = OCRSetup;




