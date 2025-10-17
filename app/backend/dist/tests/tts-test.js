"use strict";
/**
 * TTS Service Test
 * Tests Google Cloud Text-to-Speech API connection and functionality
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables first
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const tts_service_1 = require("../services/tts-service");
const fs = __importStar(require("fs"));
async function testTTSConnection() {
    console.log('\n' + '='.repeat(70));
    console.log('TTS SERVICE CONNECTION TEST');
    console.log('='.repeat(70));
    // Test 1: Check if service is available
    console.log('\n📊 Test 1: Service Availability');
    console.log('─'.repeat(70));
    const isAvailable = tts_service_1.ttsService.isAvailable();
    console.log(`TTS Service Available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
    if (!isAvailable) {
        console.error('\n❌ TTS service is not available. Check:');
        console.error('   1. TTS_ENABLED=true in .env');
        console.error('   2. GOOGLE_CLOUD_TTS_API_KEY is set');
        console.error('   3. Or GOOGLE_APPLICATION_CREDENTIALS path is valid');
        process.exit(1);
    }
    // Test 2: Simple synthesis test
    console.log('\n📊 Test 2: Simple Synthesis');
    console.log('─'.repeat(70));
    try {
        const testText = 'Hello, this is a test of the text to speech system.';
        console.log(`Synthesizing: "${testText}"`);
        const startTime = Date.now();
        const result = await tts_service_1.ttsService.synthesize({ text: testText });
        const elapsed = Date.now() - startTime;
        console.log(`✅ Synthesis successful in ${elapsed}ms`);
        console.log(`   Audio size: ${result.audioContent.length} bytes`);
        console.log(`   Estimated duration: ${result.audioDuration}s`);
    }
    catch (error) {
        console.error(`❌ Synthesis failed: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
    // Test 3: Educational narration synthesis
    console.log('\n📊 Test 3: Educational Narration');
    console.log('─'.repeat(70));
    try {
        const narrationText = `Let's explore the fundamentals of neural networks. 
    A neural network is a computational model inspired by biological neurons in the brain. 
    It consists of layers of interconnected nodes that process information through weighted connections. 
    As data flows through the network, each layer extracts increasingly abstract features.`;
        console.log(`Synthesizing educational content (${narrationText.length} chars)...`);
        const startTime = Date.now();
        const result = await tts_service_1.ttsService.synthesize({
            text: narrationText,
            speakingRate: 1.0
        });
        const elapsed = Date.now() - startTime;
        console.log(`✅ Synthesis successful in ${elapsed}ms`);
        console.log(`   Audio size: ${result.audioContent.length} bytes`);
        console.log(`   Estimated duration: ${result.audioDuration}s`);
    }
    catch (error) {
        console.error(`❌ Synthesis failed: ${error.message}`);
        process.exit(1);
    }
    // Test 4: Save to file
    console.log('\n📊 Test 4: Save Audio to File');
    console.log('─'.repeat(70));
    try {
        const testText = 'This audio will be saved to a file for verification.';
        const filename = `test-audio-${Date.now()}.mp3`;
        console.log(`Synthesizing and saving to: ${filename}`);
        const result = await tts_service_1.ttsService.synthesizeToFile({ text: testText }, filename);
        if (result.outputPath && fs.existsSync(result.outputPath)) {
            const stats = fs.statSync(result.outputPath);
            console.log(`✅ File saved successfully`);
            console.log(`   Path: ${result.outputPath}`);
            console.log(`   Size: ${stats.size} bytes`);
            console.log(`   Duration: ${result.audioDuration}s`);
        }
        else {
            throw new Error('File was not created');
        }
    }
    catch (error) {
        console.error(`❌ File save failed: ${error.message}`);
        process.exit(1);
    }
    // Test 5: Batch synthesis (simulate step narrations)
    console.log('\n📊 Test 5: Batch Synthesis (5 narrations)');
    console.log('─'.repeat(70));
    try {
        const narrations = [
            { text: "Let's begin with the introduction to neural networks and their fundamental architecture." },
            { text: "Now, observe how the input layer receives and processes data from the external environment." },
            { text: "Watch as signals propagate through hidden layers, transforming data at each step." },
            { text: "Notice the activation functions determining which neurons fire in the network." },
            { text: "Finally, see how the output layer produces the network's predictions and classifications." }
        ];
        console.log(`Synthesizing ${narrations.length} narrations in parallel...`);
        const startTime = Date.now();
        const results = await tts_service_1.ttsService.synthesizeBatch(narrations);
        const elapsed = Date.now() - startTime;
        const totalSize = results.reduce((sum, r) => sum + r.audioContent.length, 0);
        const totalDuration = results.reduce((sum, r) => sum + r.audioDuration, 0);
        console.log(`✅ Batch synthesis successful in ${elapsed}ms`);
        console.log(`   Total audio size: ${totalSize} bytes`);
        console.log(`   Total duration: ${totalDuration}s`);
        console.log(`   Average per narration: ${(elapsed / narrations.length).toFixed(0)}ms`);
        results.forEach((result, idx) => {
            console.log(`   [${idx + 1}] ${result.audioContent.length} bytes, ${result.audioDuration}s`);
        });
    }
    catch (error) {
        console.error(`❌ Batch synthesis failed: ${error.message}`);
        process.exit(1);
    }
    // Test 6: Inter-visual delay configuration
    console.log('\n📊 Test 6: Configuration Check');
    console.log('─'.repeat(70));
    const delay = tts_service_1.ttsService.getInterVisualDelay();
    console.log(`Inter-visual delay: ${delay}ms`);
    console.log(`Speaking rate: ${process.env.TTS_SPEAKING_RATE || '1.0'}`);
    console.log(`Voice name: ${process.env.TTS_VOICE_NAME || 'en-US-Journey-D'}`);
    console.log(`Audio encoding: ${process.env.TTS_AUDIO_ENCODING || 'MP3'}`);
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TTS TESTS PASSED');
    console.log('='.repeat(70));
    console.log('\n📋 Summary:');
    console.log('   ✅ Service is available and initialized');
    console.log('   ✅ Simple synthesis working');
    console.log('   ✅ Educational content synthesis working');
    console.log('   ✅ File saving working');
    console.log('   ✅ Batch synthesis working');
    console.log('   ✅ Configuration loaded correctly');
    console.log('\n🚀 TTS service is ready for production use!');
    console.log('');
    process.exit(0);
}
// Run test
testTTSConnection().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
});
//# sourceMappingURL=tts-test.js.map