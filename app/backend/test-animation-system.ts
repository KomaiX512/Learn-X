/**
 * UNIT TESTS FOR ANIMATION SYSTEM
 * 
 * Tests:
 * 1. SVG Animation Generator (various animation types)
 * 2. Enhanced Visual Planner (static vs animation specs)
 * 3. Quality Validation
 * 4. Complete pipeline integration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { generateSVGAnimation, validateAnimationQuality } from './src/agents/svgAnimationGenerator';
import { logger } from './src/logger';

// Test topics for different animation types
const TEST_CASES = [
  {
    topic: 'Blood Circulation',
    description: 'Show red blood cells, white blood cells, and platelets flowing through an artery. Label each cell type and show the vessel walls.',
    animationType: 'flow',
    expectedElements: ['<animateMotion', 'RBC', 'WBC', 'platelet']
  },
  {
    topic: 'Atomic Structure',
    description: 'Animate electrons orbiting around an atomic nucleus. Show 2-3 electron shells with different speeds. Label the nucleus and electron paths.',
    animationType: 'orbit',
    expectedElements: ['<animateTransform', 'type="rotate"', 'nucleus', 'electron']
  },
  {
    topic: 'Sound Waves',
    description: 'Show a wave propagating from left to right with labeled wavelength and amplitude. The wave should oscillate continuously.',
    animationType: 'wave',
    expectedElements: ['<animate', 'wave', 'amplitude']
  },
  {
    topic: 'Heartbeat',
    description: 'Animate a heart pulsing rhythmically. Show the four chambers labeled and the pulsing motion in a loop.',
    animationType: 'pulse',
    expectedElements: ['<animate', 'heart', 'pulse']
  },
  {
    topic: 'Pulley System',
    description: 'Show a pulley system with a weight moving up and down. Label the pulley, rope, and weight. Show the mechanical advantage.',
    animationType: 'mechanical',
    expectedElements: ['<animate', 'pulley', 'weight']
  }
];

async function runTests() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not set in environment');
    process.exit(1);
  }

  logger.info('═══════════════════════════════════════');
  logger.info('  ANIMATION SYSTEM UNIT TESTS');
  logger.info('═══════════════════════════════════════\n');

  const results = {
    total: TEST_CASES.length,
    passed: 0,
    failed: 0,
    details: [] as any[]
  };

  // Create output directory for SVG files
  const outputDir = path.join(__dirname, 'test-output-animations');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    logger.info(`\n━━━ TEST ${i + 1}/${TEST_CASES.length}: ${testCase.topic} (${testCase.animationType}) ━━━`);
    
    try {
      const startTime = Date.now();
      
      // Generate animation
      const svgCode = await generateSVGAnimation(
        testCase.topic,
        testCase.description,
        testCase.animationType,
        apiKey
      );
      
      const duration = Date.now() - startTime;
      
      // Validate structure
      const validation = validateAnimationQuality(svgCode);
      
      // Check for expected elements
      const elementsFound = testCase.expectedElements.filter(el => 
        svgCode.toLowerCase().includes(el.toLowerCase())
      );
      
      const allElementsPresent = elementsFound.length === testCase.expectedElements.length;
      
      // Save SVG to file
      const filename = `${testCase.animationType}-${testCase.topic.replace(/\s+/g, '-')}.svg`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, svgCode);
      
      // Test result
      const passed = validation.valid && allElementsPresent;
      
      if (passed) {
        results.passed++;
        logger.info(`✅ PASS: ${testCase.topic}`);
      } else {
        results.failed++;
        logger.error(`❌ FAIL: ${testCase.topic}`);
      }
      
      logger.info(`   Quality Score: ${validation.score}/100`);
      logger.info(`   Duration: ${duration}ms`);
      logger.info(`   SVG Length: ${svgCode.length} chars`);
      logger.info(`   Expected Elements: ${elementsFound.length}/${testCase.expectedElements.length}`);
      logger.info(`   Missing Elements: ${testCase.expectedElements.filter(el => !svgCode.toLowerCase().includes(el.toLowerCase())).join(', ') || 'None'}`);
      logger.info(`   Output: ${filepath}`);
      
      if (validation.issues.length > 0) {
        logger.warn(`   Issues: ${validation.issues.join(', ')}`);
      }
      
      results.details.push({
        topic: testCase.topic,
        animationType: testCase.animationType,
        passed,
        score: validation.score,
        duration,
        svgLength: svgCode.length,
        elementsFound: elementsFound.length,
        elementsExpected: testCase.expectedElements.length,
        issues: validation.issues,
        filepath
      });
      
    } catch (error: any) {
      results.failed++;
      logger.error(`❌ ERROR: ${testCase.topic} - ${error.message}`);
      
      results.details.push({
        topic: testCase.topic,
        animationType: testCase.animationType,
        passed: false,
        error: error.message
      });
    }
    
    // Small delay between tests to avoid rate limiting
    if (i < TEST_CASES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  logger.info('\n═══════════════════════════════════════');
  logger.info('  TEST SUMMARY');
  logger.info('═══════════════════════════════════════');
  logger.info(`Total Tests: ${results.total}`);
  logger.info(`Passed: ${results.passed} ✅`);
  logger.info(`Failed: ${results.failed} ❌`);
  logger.info(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  logger.info('═══════════════════════════════════════\n');

  // Detailed breakdown
  logger.info('DETAILED RESULTS:');
  results.details.forEach((detail, i) => {
    logger.info(`\n${i + 1}. ${detail.topic} (${detail.animationType})`);
    logger.info(`   Status: ${detail.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (detail.score !== undefined) {
      logger.info(`   Quality: ${detail.score}/100`);
      logger.info(`   Duration: ${detail.duration}ms`);
      logger.info(`   Elements: ${detail.elementsFound}/${detail.elementsExpected}`);
      logger.info(`   File: ${detail.filepath}`);
    }
    if (detail.error) {
      logger.error(`   Error: ${detail.error}`);
    }
  });

  // Calculate average metrics
  const successfulTests = results.details.filter(d => d.passed);
  if (successfulTests.length > 0) {
    const avgScore = successfulTests.reduce((sum, d) => sum + (d.score || 0), 0) / successfulTests.length;
    const avgDuration = successfulTests.reduce((sum, d) => sum + (d.duration || 0), 0) / successfulTests.length;
    const avgLength = successfulTests.reduce((sum, d) => sum + (d.svgLength || 0), 0) / successfulTests.length;
    
    logger.info('\n═══════════════════════════════════════');
    logger.info('  AVERAGE METRICS (Successful Tests)');
    logger.info('═══════════════════════════════════════');
    logger.info(`Average Quality Score: ${avgScore.toFixed(1)}/100`);
    logger.info(`Average Duration: ${avgDuration.toFixed(0)}ms`);
    logger.info(`Average SVG Length: ${avgLength.toFixed(0)} chars`);
    logger.info('═══════════════════════════════════════\n');
  }

  logger.info(`\n📁 All SVG files saved to: ${outputDir}`);
  logger.info(`   Open these files in a browser to view the animations!\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  logger.error('Test suite failed:', error);
  process.exit(1);
});
