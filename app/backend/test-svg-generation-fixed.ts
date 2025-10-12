/**
 * TEST: SVG GENERATION WITH SIMPLIFIED PROMPTS
 * 
 * Verifies that the simplified prompt pattern (like blood vessel example) works
 */

import { generateSVGAnimation } from './src/agents/svgAnimationGenerator';
import { generateCompleteSVG } from './src/agents/svgCompleteGenerator';
import { logger } from './src/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set log level to debug for detailed output
logger.level = 'debug';

async function testSVGGeneration() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    process.exit(1);
  }

  console.log('🧪 TESTING SIMPLIFIED SVG GENERATION');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      name: 'Blood Flow Animation',
      topic: 'Blood Circulation',
      description: 'Show blood cells (RBCs, WBCs, platelets) flowing through an artery. Include vessel walls and labels.',
      type: 'animation',
      animationType: 'flow'
    },
    {
      name: 'Cell Structure Diagram',
      topic: 'Cell Biology',
      description: 'Detailed diagram of a eukaryotic cell showing nucleus, mitochondria, ER, Golgi apparatus, and membrane.',
      type: 'static'
    },
    {
      name: 'Wave Motion',
      topic: 'Physics - Waves',
      description: 'Show a transverse wave propagating with labeled amplitude, wavelength, and frequency.',
      type: 'animation',
      animationType: 'wave'
    }
  ];

  const results: any[] = [];
  const outputDir = path.join(__dirname, 'test-output-svg');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n📐 Test ${i + 1}/${testCases.length}: ${test.name}`);
    console.log(`   Topic: ${test.topic}`);
    console.log(`   Type: ${test.type}`);
    
    const startTime = Date.now();
    let success = false;
    let error = null;
    let svgCode = '';
    let qualityScore = 0;

    try {
      if (test.type === 'animation') {
        console.log(`   Generating animation (${test.animationType})...`);
        svgCode = await generateSVGAnimation(
          test.topic,
          test.description,
          test.animationType!,
          apiKey,
          2 // max retries
        );
      } else {
        console.log(`   Generating static SVG...`);
        svgCode = await generateCompleteSVG(
          test.topic,
          test.description,
          i,
          apiKey,
          2 // max retries
        );
      }

      const genTime = Date.now() - startTime;
      
      // Basic quality checks
      const hasXMLDecl = svgCode.includes('<?xml');
      const hasSVGElement = svgCode.includes('<svg') && svgCode.includes('</svg>');
      const hasLabels = (svgCode.match(/<text/g) || []).length;
      const hasAnimations = (svgCode.match(/<(animate|animateMotion|animateTransform)/g) || []).length;
      const lineCount = svgCode.split('\n').length;
      
      qualityScore = 0;
      if (hasXMLDecl) qualityScore += 20;
      if (hasSVGElement) qualityScore += 20;
      if (hasLabels >= 5) qualityScore += 20;
      if (hasLabels >= 10) qualityScore += 10;
      if (hasAnimations >= 3 && test.type === 'animation') qualityScore += 20;
      if (lineCount >= 100) qualityScore += 10;

      console.log(`   ✅ Generated: ${svgCode.length} chars, ${lineCount} lines`);
      console.log(`   📊 Quality: ${qualityScore}/100`);
      console.log(`   ⏱️  Time: ${genTime}ms`);
      console.log(`   🏷️  Labels: ${hasLabels}`);
      console.log(`   🎬 Animations: ${hasAnimations}`);

      // Save to file
      const filename = `${test.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, svgCode, 'utf-8');
      console.log(`   💾 Saved: ${filename}`);

      success = true;

      results.push({
        test: test.name,
        success: true,
        time: genTime,
        size: svgCode.length,
        lines: lineCount,
        labels: hasLabels,
        animations: hasAnimations,
        qualityScore,
        file: filename
      });

    } catch (err: any) {
      error = err.message;
      const genTime = Date.now() - startTime;
      console.log(`   ❌ FAILED: ${error}`);
      console.log(`   ⏱️  Time: ${genTime}ms`);

      results.push({
        test: test.name,
        success: false,
        time: genTime,
        error
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgTime = successful.reduce((sum, r) => sum + r.time, 0) / successful.length;
    const avgQuality = successful.reduce((sum, r) => sum + r.qualityScore, 0) / successful.length;
    const avgSize = successful.reduce((sum, r) => sum + r.size, 0) / successful.length;
    
    console.log(`\n📈 AVERAGES (Successful):`);
    console.log(`   Time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Quality: ${avgQuality.toFixed(0)}/100`);
    console.log(`   Size: ${avgSize.toFixed(0)} chars`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILURES:`);
    failed.forEach(r => {
      console.log(`   - ${r.test}: ${r.error}`);
    });
  }

  console.log(`\n💾 Output directory: ${outputDir}`);
  
  // Overall verdict
  const successRate = (successful.length / results.length) * 100;
  console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate.toFixed(0)}%`);
  
  if (successRate >= 66) {
    console.log('✅ PASS: Simplified prompts are working!');
    return true;
  } else {
    console.log('❌ FAIL: Still having issues with SVG generation');
    return false;
  }
}

// Run test
testSVGGeneration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 Test crashed:', err);
    process.exit(1);
  });
