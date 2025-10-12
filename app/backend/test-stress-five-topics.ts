/**
 * STRESS TEST: 5 COMPLETELY DIFFERENT TOPICS
 * 
 * Verifies SVG generation quality across diverse domains
 * Cross-verifies against user's blood vessel standard
 */

import { generateSVGAnimation } from './src/agents/svgAnimationGenerator';
import { generateCompleteSVG } from './src/agents/svgCompleteGenerator';
import { logger } from './src/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
logger.level = 'debug';

// QUALITY STANDARD (based on user's blood vessel example)
const QUALITY_STANDARD = {
  minLines: 40,           // Blood vessel was 250+ but accept 40+ for variety
  minLabels: 5,           // At least 5 text labels
  minAnimations: 2,       // At least 2 animations for dynamic types
  requireXML: true,       // Must have <?xml declaration
  requireDOCTYPE: true,   // Must have DOCTYPE (optional but nice)
  requireViewBox: true,   // Must have viewBox
  requireStyle: true,     // Must have <style> section
  requireDefs: false,     // Defs are optional but good
  minChars: 1500          // Minimum character count
};

interface TestCase {
  id: number;
  topic: string;
  description: string;
  type: 'animation' | 'static';
  animationType?: 'flow' | 'orbit' | 'pulse' | 'wave' | 'mechanical';
  domain: string;
  expectedElements: string[];  // What we expect to see in the SVG
}

const TEST_CASES: TestCase[] = [
  {
    id: 1,
    topic: 'Mitochondrial ATP Synthesis',
    description: 'Show the electron transport chain in mitochondria with electrons flowing through protein complexes (Complex I, II, III, IV), pumping H+ ions across the membrane, and ATP synthase rotating to produce ATP. Include the inner membrane, matrix, and intermembrane space with clear labels.',
    type: 'animation',
    animationType: 'flow',
    domain: 'Cell Biology',
    expectedElements: ['Complex I', 'Complex II', 'Complex III', 'Complex IV', 'ATP Synthase', 'electron', 'H+', 'ATP', 'ADP', 'membrane', 'matrix']
  },
  {
    id: 2,
    topic: 'Quantum Particle in a Box',
    description: 'Visualize a quantum particle confined in a 1D potential well showing the first three energy levels (n=1, n=2, n=3) with their wave functions (ψ₁, ψ₂, ψ₃). Display the probability density |ψ|² for each state, energy level diagram with E₁, E₂, E₃ values, and nodes in wave functions.',
    type: 'static',
    domain: 'Quantum Mechanics',
    expectedElements: ['n=1', 'n=2', 'n=3', 'ψ', 'E₁', 'E₂', 'E₃', 'probability', 'energy', 'wave function']
  },
  {
    id: 3,
    topic: 'Binary Search Tree Operations',
    description: 'Animate the insertion of nodes into a Binary Search Tree with values: 50, 30, 70, 20, 40, 60, 80. Show the tree structure dynamically building with each insertion, display parent-child relationships with connecting lines, and highlight the current node being inserted with color changes.',
    type: 'animation',
    animationType: 'pulse',
    domain: 'Computer Science',
    expectedElements: ['Node', 'root', 'left', 'right', '50', '30', '70', '20', '40', '60', '80', 'BST']
  },
  {
    id: 4,
    topic: 'Benzene Resonance Structures',
    description: 'Display both Kekulé resonance structures of benzene (C₆H₆) showing alternating single and double bonds. Include all carbon atoms numbered 1-6, hydrogen atoms, delocalized π-electrons shown as a ring, bond lengths (1.39 Å), and resonance arrows between structures. Show molecular orbital representation.',
    type: 'static',
    domain: 'Organic Chemistry',
    expectedElements: ['C₆H₆', 'benzene', 'carbon', 'hydrogen', 'π-electron', 'resonance', 'bond', 'aromatic']
  },
  {
    id: 5,
    topic: 'Planetary Orbital Mechanics',
    description: 'Animate Earth orbiting the Sun in an elliptical path showing perihelion (closest point) and aphelion (farthest point). Display Kepler\'s laws with orbital velocity changes (faster at perihelion, slower at aphelion), gravitational force vectors, and the Sun at one focus of the ellipse. Include distance markers and velocity indicators.',
    type: 'animation',
    animationType: 'orbit',
    domain: 'Astrophysics',
    expectedElements: ['Sun', 'Earth', 'orbit', 'ellipse', 'perihelion', 'aphelion', 'velocity', 'force', 'Kepler']
  }
];

interface QualityMetrics {
  meetsStandard: boolean;
  score: number;
  details: {
    lines: number;
    chars: number;
    labels: number;
    animations: number;
    hasXML: boolean;
    hasDOCTYPE: boolean;
    hasViewBox: boolean;
    hasStyle: boolean;
    hasDefs: boolean;
    hasExpectedElements: number;
    contextRelevance: number;  // 0-100%
  };
  issues: string[];
  strengths: string[];
}

function analyzeQuality(svgCode: string, testCase: TestCase): QualityMetrics {
  const lines = svgCode.split('\n').length;
  const chars = svgCode.length;
  const labels = (svgCode.match(/<text/g) || []).length;
  const animations = (svgCode.match(/<(animate|animateMotion|animateTransform)/g) || []).length;
  
  const hasXML = svgCode.includes('<?xml');
  const hasDOCTYPE = svgCode.includes('<!DOCTYPE');
  const hasViewBox = svgCode.includes('viewBox');
  const hasStyle = svgCode.includes('<style>');
  const hasDefs = svgCode.includes('<defs>');
  
  // Check for expected domain-specific elements
  let foundElements = 0;
  const foundElementsList: string[] = [];
  const missingElements: string[] = [];
  
  for (const element of testCase.expectedElements) {
    const regex = new RegExp(element, 'i');
    if (regex.test(svgCode)) {
      foundElements++;
      foundElementsList.push(element);
    } else {
      missingElements.push(element);
    }
  }
  
  const contextRelevance = (foundElements / testCase.expectedElements.length) * 100;
  
  const issues: string[] = [];
  const strengths: string[] = [];
  
  // Check against quality standard
  if (lines < QUALITY_STANDARD.minLines) {
    issues.push(`Too few lines: ${lines} < ${QUALITY_STANDARD.minLines}`);
  } else {
    strengths.push(`Good length: ${lines} lines`);
  }
  
  if (chars < QUALITY_STANDARD.minChars) {
    issues.push(`Too short: ${chars} chars < ${QUALITY_STANDARD.minChars}`);
  } else {
    strengths.push(`Sufficient detail: ${chars} chars`);
  }
  
  if (labels < QUALITY_STANDARD.minLabels) {
    issues.push(`Insufficient labels: ${labels} < ${QUALITY_STANDARD.minLabels}`);
  } else {
    strengths.push(`Educational labels: ${labels} text elements`);
  }
  
  if (testCase.type === 'animation' && animations < QUALITY_STANDARD.minAnimations) {
    issues.push(`Too few animations: ${animations} < ${QUALITY_STANDARD.minAnimations}`);
  } else if (testCase.type === 'animation' && animations >= QUALITY_STANDARD.minAnimations) {
    strengths.push(`Dynamic animations: ${animations} SMIL elements`);
  }
  
  if (!hasXML) issues.push('Missing XML declaration');
  else strengths.push('Has XML declaration');
  
  if (!hasViewBox) issues.push('Missing viewBox');
  else strengths.push('Has viewBox');
  
  if (!hasStyle) issues.push('Missing <style> section');
  else strengths.push('Has style definitions');
  
  if (hasDefs) strengths.push('Uses <defs> for reusable components');
  
  if (contextRelevance < 30) {
    issues.push(`Low context relevance: ${contextRelevance.toFixed(0)}% (missing: ${missingElements.join(', ')})`);
  } else if (contextRelevance >= 50) {
    strengths.push(`High context relevance: ${contextRelevance.toFixed(0)}% (found: ${foundElementsList.join(', ')})`);
  }
  
  // Calculate overall score (0-100)
  let score = 0;
  if (hasXML) score += 10;
  if (hasViewBox) score += 10;
  if (hasStyle) score += 10;
  if (hasDefs) score += 5;
  score += Math.min(20, labels * 2);  // Up to 20 points for labels
  if (testCase.type === 'animation') {
    score += Math.min(15, animations * 3);  // Up to 15 points for animations
  } else {
    score += 15;  // Static gets base points
  }
  score += Math.min(30, contextRelevance * 0.3);  // Up to 30 points for context relevance
  
  const meetsStandard = 
    hasXML &&
    hasViewBox &&
    labels >= QUALITY_STANDARD.minLabels &&
    chars >= QUALITY_STANDARD.minChars &&
    contextRelevance >= 30 &&
    (testCase.type !== 'animation' || animations >= QUALITY_STANDARD.minAnimations);
  
  return {
    meetsStandard,
    score: Math.min(100, score),
    details: {
      lines,
      chars,
      labels,
      animations,
      hasXML,
      hasDOCTYPE,
      hasViewBox,
      hasStyle,
      hasDefs,
      hasExpectedElements: foundElements,
      contextRelevance
    },
    issues,
    strengths
  };
}

async function runStressTest() {
  console.log('🔥 STRESS TEST: 5 COMPLETELY DIFFERENT TOPICS');
  console.log('='.repeat(70));
  console.log('Testing SVG generation quality across diverse domains\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    process.exit(1);
  }
  
  console.log('📋 QUALITY STANDARD (based on blood vessel example):');
  console.log(`  - Min lines: ${QUALITY_STANDARD.minLines}`);
  console.log(`  - Min labels: ${QUALITY_STANDARD.minLabels}`);
  console.log(`  - Min animations (for dynamic): ${QUALITY_STANDARD.minAnimations}`);
  console.log(`  - Min chars: ${QUALITY_STANDARD.minChars}`);
  console.log(`  - Required: XML declaration, viewBox, style section`);
  console.log(`  - Context relevance: Must reference topic-specific terms\n`);
  
  const outputDir = path.join(__dirname, 'test-stress-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const results: any[] = [];
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    
    console.log('━'.repeat(70));
    console.log(`\n🧪 TEST ${testCase.id}/5: ${testCase.topic}`);
    console.log(`   Domain: ${testCase.domain}`);
    console.log(`   Type: ${testCase.type}${testCase.animationType ? ` (${testCase.animationType})` : ''}`);
    console.log(`   Expected Elements: ${testCase.expectedElements.slice(0, 5).join(', ')}...`);
    console.log('');
    
    const startTime = Date.now();
    let svgCode = '';
    let error = null;
    
    try {
      if (testCase.type === 'animation') {
        console.log(`   🎬 Generating ${testCase.animationType} animation...`);
        svgCode = await generateSVGAnimation(
          testCase.topic,
          testCase.description,
          testCase.animationType!,
          apiKey,
          2
        );
      } else {
        console.log(`   📊 Generating static diagram...`);
        svgCode = await generateCompleteSVG(
          testCase.topic,
          testCase.description,
          i,
          apiKey,
          2
        );
      }
      
      const genTime = Date.now() - startTime;
      
      // Analyze quality
      const quality = analyzeQuality(svgCode, testCase);
      
      console.log(`\n   ⏱️  Generation time: ${genTime}ms`);
      console.log(`   📊 Quality Score: ${quality.score}/100`);
      console.log(`   ${quality.meetsStandard ? '✅' : '❌'} Meets Standard: ${quality.meetsStandard}`);
      console.log('');
      console.log('   📈 Metrics:');
      console.log(`      - Lines: ${quality.details.lines}`);
      console.log(`      - Characters: ${quality.details.chars}`);
      console.log(`      - Labels: ${quality.details.labels}`);
      console.log(`      - Animations: ${quality.details.animations}`);
      console.log(`      - Context Relevance: ${quality.details.contextRelevance.toFixed(1)}% (${quality.details.hasExpectedElements}/${testCase.expectedElements.length} elements found)`);
      console.log('');
      console.log('   ✓ Strengths:');
      quality.strengths.forEach(s => console.log(`      + ${s}`));
      
      if (quality.issues.length > 0) {
        console.log('');
        console.log('   ⚠️  Issues:');
        quality.issues.forEach(i => console.log(`      - ${i}`));
      }
      
      // Save SVG
      const filename = `test${testCase.id}-${testCase.topic.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}.svg`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, svgCode, 'utf-8');
      console.log(`\n   💾 Saved: ${filename}`);
      
      results.push({
        id: testCase.id,
        topic: testCase.topic,
        domain: testCase.domain,
        type: testCase.type,
        success: true,
        meetsStandard: quality.meetsStandard,
        score: quality.score,
        time: genTime,
        metrics: quality.details,
        strengths: quality.strengths.length,
        issues: quality.issues.length,
        filename
      });
      
    } catch (err: any) {
      const genTime = Date.now() - startTime;
      error = err.message;
      console.log(`\n   ❌ FAILED: ${error}`);
      console.log(`   ⏱️  Time: ${genTime}ms`);
      
      results.push({
        id: testCase.id,
        topic: testCase.topic,
        domain: testCase.domain,
        type: testCase.type,
        success: false,
        error,
        time: genTime
      });
    }
    
    // Small delay between tests
    if (i < TEST_CASES.length - 1) {
      console.log('\n   ⏳ Waiting 2s before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // FINAL SUMMARY
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL STRESS TEST RESULTS');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const meetsStandard = successful.filter(r => r.meetsStandard);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`🏆 Meets Standard: ${meetsStandard.length}/${successful.length} (of successful)`);
  
  if (successful.length > 0) {
    const avgScore = successful.reduce((sum, r) => sum + r.score, 0) / successful.length;
    const avgTime = successful.reduce((sum, r) => sum + r.time, 0) / successful.length;
    const avgLabels = successful.reduce((sum, r) => sum + r.metrics.labels, 0) / successful.length;
    const avgRelevance = successful.reduce((sum, r) => sum + r.metrics.contextRelevance, 0) / successful.length;
    
    console.log(`\n📈 AVERAGES (Successful Tests):`);
    console.log(`   - Quality Score: ${avgScore.toFixed(1)}/100`);
    console.log(`   - Generation Time: ${avgTime.toFixed(0)}ms`);
    console.log(`   - Labels per SVG: ${avgLabels.toFixed(1)}`);
    console.log(`   - Context Relevance: ${avgRelevance.toFixed(1)}%`);
  }
  
  console.log(`\n📋 DETAILED RESULTS:`);
  results.forEach(r => {
    const status = r.success ? (r.meetsStandard ? '🏆' : '⚠️ ') : '❌';
    const score = r.success ? `${r.score}/100` : 'FAILED';
    console.log(`   ${status} Test ${r.id}: ${r.topic.substring(0, 40)} - ${score}`);
    if (r.success && !r.meetsStandard) {
      console.log(`      ⚠️  Generated but below standard (${r.issues} issues)`);
    }
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILURES:`);
    failed.forEach(r => {
      console.log(`   - Test ${r.id} (${r.domain}): ${r.error}`);
    });
  }
  
  console.log(`\n💾 Output directory: ${outputDir}`);
  console.log(`📁 Generated files: ${successful.length} SVG files`);
  
  // Overall verdict
  const successRate = (successful.length / results.length) * 100;
  const standardRate = (meetsStandard.length / results.length) * 100;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎯 OVERALL VERDICT:`);
  console.log(`   - Success Rate: ${successRate.toFixed(0)}%`);
  console.log(`   - Standard Compliance: ${standardRate.toFixed(0)}%`);
  
  if (standardRate >= 80) {
    console.log(`   ✅ EXCELLENT: System meets quality standard across diverse topics`);
    return true;
  } else if (standardRate >= 60) {
    console.log(`   ⚠️  GOOD: System works but needs quality improvements`);
    return false;
  } else {
    console.log(`   ❌ NEEDS WORK: Quality standard not consistently met`);
    return false;
  }
}

// Run stress test
runStressTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n💥 Stress test crashed:', err);
    process.exit(1);
  });
