/**
 * TTS Service Test
 * Tests Google Cloud Text-to-Speech API connection and functionality
 */

// Load environment variables first
import * as dotenv from 'dotenv';
dotenv.config();

import { ttsService, TTSOptions } from '../services/tts-service';
import { logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';

async function testTTSConnection() {
  console.log('\n' + '='.repeat(70));
  console.log('TTS SERVICE CONNECTION TEST');
  console.log('='.repeat(70));
  
  // Test 1: Check if service is available
  console.log('\n📊 Test 1: Service Availability');
  console.log('─'.repeat(70));
  
  const isAvailable = ttsService.isAvailable();
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
    const result = await ttsService.synthesize({ text: testText });
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Synthesis successful in ${elapsed}ms`);
    console.log(`   Audio size: ${result.audioContent.length} bytes`);
    console.log(`   Estimated duration: ${result.audioDuration}s`);
    
  } catch (error: any) {
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
    const result = await ttsService.synthesize({ 
      text: narrationText,
      speakingRate: 1.0
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Synthesis successful in ${elapsed}ms`);
    console.log(`   Audio size: ${result.audioContent.length} bytes`);
    console.log(`   Estimated duration: ${result.audioDuration}s`);
    
  } catch (error: any) {
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
    
    const result = await ttsService.synthesizeToFile({ text: testText }, filename);
    
    if (result.outputPath && fs.existsSync(result.outputPath)) {
      const stats = fs.statSync(result.outputPath);
      console.log(`✅ File saved successfully`);
      console.log(`   Path: ${result.outputPath}`);
      console.log(`   Size: ${stats.size} bytes`);
      console.log(`   Duration: ${result.audioDuration}s`);
    } else {
      throw new Error('File was not created');
    }
    
  } catch (error: any) {
    console.error(`❌ File save failed: ${error.message}`);
    process.exit(1);
  }
  
  // Test 5: Batch synthesis (simulate step narrations)
  console.log('\n📊 Test 5: Batch Synthesis (5 narrations)');
  console.log('─'.repeat(70));
  
  try {
    const narrations: TTSOptions[] = [
      { text: "Let's begin with the introduction to neural networks and their fundamental architecture." },
      { text: "Now, observe how the input layer receives and processes data from the external environment." },
      { text: "Watch as signals propagate through hidden layers, transforming data at each step." },
      { text: "Notice the activation functions determining which neurons fire in the network." },
      { text: "Finally, see how the output layer produces the network's predictions and classifications." }
    ];
    
    console.log(`Synthesizing ${narrations.length} narrations in parallel...`);
    
    const startTime = Date.now();
    const results = await ttsService.synthesizeBatch(narrations);
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
    
  } catch (error: any) {
    console.error(`❌ Batch synthesis failed: ${error.message}`);
    process.exit(1);
  }
  
  // Test 6: Inter-visual delay configuration
  console.log('\n📊 Test 6: Configuration Check');
  console.log('─'.repeat(70));
  
  const delay = ttsService.getInterVisualDelay();
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
