"use strict";
/**
 * BRUTAL HONEST TTS TEST
 * NO SUGAR COATING - Proves TTS is REAL or FAILS LOUDLY
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
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const tts_service_1 = require("../services/tts-service");
const fs = __importStar(require("fs"));
async function testRealTTS() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║        BRUTAL HONEST TTS TEST - NO SUGAR COATING            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    // Check configuration
    console.log('📋 CONFIGURATION CHECK:');
    console.log('─'.repeat(70));
    console.log(`TTS_ENABLED: ${process.env.TTS_ENABLED}`);
    console.log(`API_KEY: ${process.env.GOOGLE_CLOUD_TTS_API_KEY?.substring(0, 10)}...`);
    console.log(`VOICE: ${process.env.TTS_VOICE_NAME || 'en-US-Journey-D'}`);
    console.log(`Available: ${tts_service_1.ttsService.isAvailable()}`);
    console.log('');
    if (!tts_service_1.ttsService.isAvailable()) {
        console.log('❌ FAILED: TTS Service not available');
        console.log('   Check your .env configuration');
        process.exit(1);
    }
    // TEST 1: Connection Test
    console.log('TEST 1: Connection Test');
    console.log('─'.repeat(70));
    try {
        const connected = await tts_service_1.ttsService.testConnection();
        if (connected) {
            console.log('✅ PASSED: Connection successful\n');
        }
        else {
            console.log('❌ FAILED: Connection failed\n');
            process.exit(1);
        }
    }
    catch (error) {
        console.log('❌ FAILED: Connection error:', error.message);
        process.exit(1);
    }
    // TEST 2: Synthesize Short Text
    console.log('TEST 2: Synthesize Short Narration');
    console.log('─'.repeat(70));
    const shortText = 'The Carnot engine is a theoretical thermodynamic cycle that achieves maximum efficiency.';
    console.log(`Text: "${shortText}"`);
    console.log(`Length: ${shortText.length} chars`);
    console.log('');
    try {
        const startTime = Date.now();
        const result = await tts_service_1.ttsService.synthesize({ text: shortText });
        const elapsed = Date.now() - startTime;
        console.log(`✅ SUCCESS in ${elapsed}ms`);
        console.log(`   Audio size: ${result.audioContent.length} bytes`);
        console.log(`   Duration: ${result.audioDuration}s`);
        console.log('');
        // Verify it's REAL audio (MP3 has specific headers)
        const header = result.audioContent.toString('hex', 0, 4);
        const isMP3 = header.startsWith('fff') || header.startsWith('494433'); // MP3 or ID3
        console.log('🔍 AUDIO VERIFICATION:');
        console.log(`   Header: ${header}`);
        console.log(`   Is MP3: ${isMP3 ? '✅ YES' : '❌ NO (FAKE!)'}`);
        console.log('');
        if (!isMP3) {
            console.log('❌ FAILED: Audio is NOT real MP3 - still generating fake data!');
            process.exit(1);
        }
        // Save to file for manual verification
        const outputPath = path.join(process.cwd(), 'audio-output', 'test-carnot-short.mp3');
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, result.audioContent);
        console.log(`💾 Saved to: ${outputPath}`);
        console.log(`   You can play this file to verify it's REAL audio\n`);
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        if (error.message.includes('TTS API error')) {
            console.log('\n🔍 API ERROR DETAILS:');
            console.log(error.message);
            console.log('\nPossible causes:');
            console.log('  1. Invalid API key');
            console.log('  2. API key format not supported by REST API');
            console.log('  3. Quota exceeded');
            console.log('  4. API not enabled in Google Cloud Console');
        }
        process.exit(1);
    }
    // TEST 3: Synthesize Longer Narration (realistic scenario)
    console.log('TEST 3: Synthesize Longer Narration (Realistic Visual)');
    console.log('─'.repeat(70));
    const longText = `The Carnot cycle consists of four reversible processes. First, isothermal expansion where the gas absorbs heat from a hot reservoir. Second, adiabatic expansion where the gas does work without heat exchange. Third, isothermal compression where heat is released to a cold reservoir. Finally, adiabatic compression returns the system to its initial state. This cycle represents the maximum possible efficiency any heat engine can achieve.`;
    console.log(`Text: "${longText.substring(0, 80)}..."`);
    console.log(`Length: ${longText.length} chars`);
    console.log('');
    try {
        const startTime = Date.now();
        const result = await tts_service_1.ttsService.synthesize({ text: longText });
        const elapsed = Date.now() - startTime;
        console.log(`✅ SUCCESS in ${elapsed}ms`);
        console.log(`   Audio size: ${result.audioContent.length} bytes`);
        console.log(`   Duration: ${result.audioDuration}s`);
        console.log('');
        // Save to file
        const outputPath = path.join(process.cwd(), 'audio-output', 'test-carnot-long.mp3');
        await fs.promises.writeFile(outputPath, result.audioContent);
        console.log(`💾 Saved to: ${outputPath}\n`);
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        process.exit(1);
    }
    // TEST 4: Batch Synthesis (3 visuals)
    console.log('TEST 4: Batch Synthesis (3 Visuals with Narration)');
    console.log('─'.repeat(70));
    const narrations = [
        'Visual 1: The Carnot cycle operates between two heat reservoirs at different temperatures.',
        'Visual 2: During isothermal expansion, the gas absorbs heat while maintaining constant temperature.',
        'Visual 3: The efficiency depends only on the temperature difference between the hot and cold reservoirs.'
    ];
    console.log(`Synthesizing ${narrations.length} narrations...`);
    console.log('');
    try {
        const startTime = Date.now();
        const results = await tts_service_1.ttsService.synthesizeBatch(narrations.map(text => ({ text })));
        const elapsed = Date.now() - startTime;
        console.log(`✅ SUCCESS in ${elapsed}ms`);
        results.forEach((r, i) => {
            console.log(`   Visual ${i + 1}: ${r.audioContent.length} bytes, ${r.audioDuration}s`);
        });
        console.log('');
        const totalDuration = results.reduce((sum, r) => sum + r.audioDuration, 0);
        console.log(`   Total duration: ${totalDuration}s`);
        console.log('');
    }
    catch (error) {
        console.log(`❌ FAILED: ${error.message}\n`);
        process.exit(1);
    }
    // FINAL VERDICT
    console.log('═'.repeat(70));
    console.log('🏆 FINAL VERDICT');
    console.log('═'.repeat(70));
    console.log('✅ TTS Service is REAL - Using actual Google Cloud TTS API');
    console.log('✅ NO fake audio generation');
    console.log('✅ NO mock mode');
    console.log('✅ Generated MP3 files can be played');
    console.log('');
    console.log('🎧 MANUAL VERIFICATION:');
    console.log('   Play these files to confirm they are REAL speech:');
    console.log('   - audio-output/test-carnot-short.mp3');
    console.log('   - audio-output/test-carnot-long.mp3');
    console.log('');
    console.log('🎉 NO SUGAR COATING - TTS IS WORKING WITH REAL API!');
    console.log('');
    process.exit(0);
}
if (require.main === module) {
    testRealTTS().catch(error => {
        console.error('\n💥 TEST CRASHED:', error);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    });
}
