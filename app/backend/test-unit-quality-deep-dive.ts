/**
 * DEEP QUALITY UNIT TESTING
 * 
 * Systematically tests each component to identify quality issues:
 * 1. Subplanner - Are descriptions clear and unambiguous?
 * 2. Static Generator - Is quality good? Are prompts clear?
 * 3. Animation Generator - Is quality good? Creative freedom?
 * 
 * Tests MUST work for billion topics - NO HARDCODING
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './src/logger';

// Load environment
dotenv.config({ path: path.join(__dirname, '.env') });

// Import generators
import { generateInsaneVisuals } from './src/agents/svgMasterGenerator';
import { generateSVGAnimation } from './src/agents/svgAnimationGenerator';

// Test topics - diverse domains to ensure NO HARDCODING
const TEST_TOPICS = [
  {
    topic: "Photosynthesis in Plants",
    step: "Light-dependent reactions in the thylakoid membrane",
    domain: "Biology"
  },
  {
    topic: "Quantum Entanglement",
    step: "How entangled particles behave when measured",
    domain: "Physics"
  },
  {
    topic: "TCP/IP Protocol Stack",
    step: "How data packets travel through network layers",
    domain: "Computer Science"
  },
  {
    topic: "Organic Chemistry Reactions",
    step: "Nucleophilic substitution SN2 mechanism",
    domain: "Chemistry"
  },
  {
    topic: "Machine Learning Backpropagation",
    step: "Gradient descent optimization through neural network layers",
    domain: "Computer Science"
  }
];

interface SubPlannerTest {
  topic: string;
  step: string;
  domain: string;
  specs: VisualSpec[];
  quality: {
    clarity: number;  // 0-100, are descriptions clear?
    specificity: number;  // 0-100, topic-specific or generic?
    actionable: number;  // 0-100, can generator understand it?
    issues: string[];
  };
}

interface VisualSpec {
  description: string;
  type: 'static' | 'animation';
  animationType?: 'flow' | 'orbit' | 'pulse' | 'wave' | 'mechanical';
}

interface StaticGeneratorTest {
  description: string;
  topic: string;
  operations: any[];
  quality: {
    operationCount: number;
    diversity: number;  // 0-100, variety of operation types
    contextRelevance: number;  // 0-100, matches topic
    hasAdvancedOps: boolean;  // graphs, latex, paths, waves
    issues: string[];
  };
}

interface AnimationGeneratorTest {
  description: string;
  topic: string;
  animationType: string;
  svgCode: string;
  quality: {
    hasAnimations: boolean;
    animationCount: number;
    loopsIndefinitely: boolean;
    labelCount: number;
    usesAdvancedSVG: boolean;  // defs, groups, complex paths
    issues: string[];
  };
}

/**
 * STEP 1: TEST SUBPLANNER
 * Verify descriptions are clear, specific, and actionable
 */
async function testSubPlanner(testCase: { topic: string; step: string; domain: string }): Promise<SubPlannerTest> {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`🧪 TESTING SUBPLANNER: ${testCase.topic}`);
  logger.info(`${'='.repeat(80)}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  // Import and call the actual planVisualsEnhanced function
  const { planVisualsEnhanced } = await import('./src/agents/codegenV3');
  
  const specs = await planVisualsEnhanced(
    { desc: testCase.step } as any,
    testCase.topic,
    apiKey
  );

  logger.info(`📝 Generated ${specs.length} specifications`);
  logger.info(`   Static: ${specs.filter(s => s.type === 'static').length}`);
  logger.info(`   Animations: ${specs.filter(s => s.type === 'animation').length}`);

  // Analyze quality
  const quality = analyzeSubPlannerQuality(specs, testCase.topic, testCase.domain);

  // Print each spec
  specs.forEach((spec, i) => {
    logger.info(`\n📋 Spec ${i + 1} [${spec.type}${spec.animationType ? ` - ${spec.animationType}` : ''}]:`);
    logger.info(`   ${spec.description}`);
  });

  logger.info(`\n📊 QUALITY ANALYSIS:`);
  logger.info(`   Clarity: ${quality.clarity}/100`);
  logger.info(`   Specificity: ${quality.specificity}/100`);
  logger.info(`   Actionable: ${quality.actionable}/100`);
  
  if (quality.issues.length > 0) {
    logger.warn(`\n⚠️  ISSUES DETECTED:`);
    quality.issues.forEach(issue => logger.warn(`   - ${issue}`));
  } else {
    logger.info(`\n✅ NO ISSUES - Descriptions are excellent!`);
  }

  return { ...testCase, specs, quality };
}

/**
 * Analyze subplanner output quality
 */
function analyzeSubPlannerQuality(specs: VisualSpec[], topic: string, domain: string): {
  clarity: number;
  specificity: number;
  actionable: number;
  issues: string[];
} {
  const issues: string[] = [];
  let clarity = 100;
  let specificity = 100;
  let actionable = 100;

  // Extract topic keywords - more flexible matching
  const topicKeywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Domain-specific term indicators
  const domainTerms: { [key: string]: string[] } = {
    'Physics': ['quantum', 'electron', 'photon', 'particle', 'wave', 'measurement', 'entangle', 'spin', 'energy'],
    'Biology': ['cell', 'membrane', 'photosynthesis', 'chloroplast', 'enzyme', 'protein', 'dna', 'molecule'],
    'Computer Science': ['tcp', 'ip', 'packet', 'layer', 'protocol', 'data', 'network', 'stack'],
    'Chemistry': ['atom', 'molecule', 'bond', 'reaction', 'nucleophilic', 'substitution', 'electron'],
    'Machine Learning': ['neural', 'gradient', 'backpropagation', 'layer', 'weight', 'neuron', 'network']
  };
  
  const relevantTerms = domainTerms[domain] || [];
  
  specs.forEach((spec, index) => {
    const desc = spec.description.toLowerCase();
    
    // Check clarity - vague terms reduce score
    const vaguePhrases = [
      'show the', 'display the', 'create a', 'make a', 'draw a',
      'illustrate', 'demonstrate', 'represent', 'depict', 'visualize'
    ];
    const vagueCount = vaguePhrases.filter(phrase => desc.includes(phrase)).length;
    if (vagueCount > 2) {
      issues.push(`Spec ${index + 1}: Too many vague phrases (${vagueCount})`);
      clarity -= 10;
    }

    // Check specificity - must contain topic or domain-specific terms
    const hasTopicTerms = topicKeywords.some(keyword => desc.includes(keyword));
    const hasDomainTerms = relevantTerms.some(term => desc.includes(term));
    if (!hasTopicTerms && !hasDomainTerms) {
      issues.push(`Spec ${index + 1}: No topic or domain-specific terms found`);
      specificity -= 20;
    }

    // Check for generic descriptions
    const genericPhrases = ['the process', 'the system', 'the structure', 'the concept'];
    const hasGeneric = genericPhrases.some(phrase => desc.includes(phrase));
    if (hasGeneric) {
      issues.push(`Spec ${index + 1}: Uses generic phrases`);
      specificity -= 10;
    }

    // Check actionability - should mention visual elements
    const visualElements = ['label', 'color', 'arrow', 'diagram', 'show', 'display', 'position'];
    const hasVisualGuidance = visualElements.some(elem => desc.includes(elem));
    if (!hasVisualGuidance) {
      issues.push(`Spec ${index + 1}: Lacks visual guidance (no mention of labels, colors, layout)`);
      actionable -= 15;
    }

    // Check length - too short or too long
    const wordCount = spec.description.split(/\s+/).length;
    if (wordCount < 10) {
      issues.push(`Spec ${index + 1}: Description too short (${wordCount} words)`);
      clarity -= 10;
    } else if (wordCount > 60) {
      issues.push(`Spec ${index + 1}: Description too long (${wordCount} words)`);
      clarity -= 5;
    }

    // For animations, check if motion is described
    if (spec.type === 'animation') {
      const motionWords = ['move', 'flow', 'rotate', 'orbit', 'pulse', 'oscillate', 'travel', 'circulate'];
      const describesMotion = motionWords.some(word => desc.includes(word));
      if (!describesMotion) {
        issues.push(`Spec ${index + 1}: Animation but doesn't describe motion`);
        actionable -= 20;
      }
    }
  });

  return {
    clarity: Math.max(0, clarity),
    specificity: Math.max(0, specificity),
    actionable: Math.max(0, actionable),
    issues
  };
}

/**
 * STEP 2: TEST STATIC VISUAL GENERATOR
 * Verify quality, diversity, context relevance
 */
async function testStaticGenerator(description: string, topic: string): Promise<StaticGeneratorTest> {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`🎨 TESTING STATIC GENERATOR`);
  logger.info(`Topic: ${topic}`);
  logger.info(`Description: ${description}`);
  logger.info(`${'='.repeat(80)}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  try {
    const operations = await generateInsaneVisuals(topic, description, apiKey);
    
    logger.info(`\n📊 Generated ${operations.length} operations`);
    
    // Analyze quality
    const quality = analyzeStaticQuality(operations, topic, description);
    
    logger.info(`\n📈 QUALITY METRICS:`);
    logger.info(`   Operation Count: ${quality.operationCount}`);
    logger.info(`   Diversity: ${quality.diversity}/100`);
    logger.info(`   Context Relevance: ${quality.contextRelevance}/100`);
    logger.info(`   Has Advanced Ops: ${quality.hasAdvancedOps ? 'YES ✅' : 'NO ❌'}`);
    
    // Show operation breakdown
    const opTypes = operations.map((op: any) => op.op);
    const opCounts = opTypes.reduce((acc: any, op: string) => {
      acc[op] = (acc[op] || 0) + 1;
      return acc;
    }, {});
    
    logger.info(`\n🔧 OPERATION BREAKDOWN:`);
    Object.entries(opCounts).forEach(([op, count]) => {
      logger.info(`   ${op}: ${count}`);
    });
    
    if (quality.issues.length > 0) {
      logger.warn(`\n⚠️  ISSUES DETECTED:`);
      quality.issues.forEach(issue => logger.warn(`   - ${issue}`));
    } else {
      logger.info(`\n✅ NO ISSUES - Quality is excellent!`);
    }

    return { description, topic, operations, quality };
  } catch (error: any) {
    logger.error(`❌ Generation failed: ${error.message}`);
    return {
      description,
      topic,
      operations: [],
      quality: {
        operationCount: 0,
        diversity: 0,
        contextRelevance: 0,
        hasAdvancedOps: false,
        issues: [`Generation failed: ${error.message}`]
      }
    };
  }
}

/**
 * Analyze static visual quality
 */
function analyzeStaticQuality(operations: any[], topic: string, description: string): {
  operationCount: number;
  diversity: number;
  contextRelevance: number;
  hasAdvancedOps: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  const operationCount = operations.length;
  
  // Check operation diversity
  const opTypes = [...new Set(operations.map((op: any) => op.op))];
  const diversity = Math.min(100, (opTypes.length / 8) * 100);  // 8+ unique ops = 100%
  
  if (opTypes.length < 3) {
    issues.push(`Low operation diversity (only ${opTypes.length} types)`);
  }
  
  // Check for advanced operations
  const advancedOps = ['drawGraph', 'addLatex', 'customPath', 'drawWave', 'addParticle'];
  const hasAdvancedOps = advancedOps.some(op => opTypes.includes(op));
  
  if (!hasAdvancedOps) {
    issues.push('No advanced operations (graphs, latex, paths, waves, particles)');
  }
  
  // Check for generic fallback patterns
  const genericLabels = operations.filter((op: any) => 
    op.op === 'drawLabel' && 
    (op.text?.includes('Label') || op.text?.includes('Part') || op.text?.includes('Concept'))
  );
  
  if (genericLabels.length > 0) {
    issues.push(`Generic fallback labels detected (${genericLabels.length} instances)`);
  }
  
  // Context relevance - check if operations match description
  const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const opTexts = operations
    .filter((op: any) => op.text || op.label)
    .map((op: any) => (op.text || op.label).toLowerCase());
  
  const contextMatches = descWords.filter(word => 
    opTexts.some(text => text.includes(word))
  ).length;
  
  const contextRelevance = Math.min(100, (contextMatches / Math.max(1, descWords.length)) * 100);
  
  if (contextRelevance < 30) {
    issues.push(`Low context relevance (${contextRelevance}%) - operations don't match description`);
  }
  
  // Check operation count
  if (operationCount < 5) {
    issues.push(`Too few operations (${operationCount}) - target is 8-12`);
  }
  
  return {
    operationCount,
    diversity,
    contextRelevance,
    hasAdvancedOps,
    issues
  };
}

/**
 * STEP 3: TEST ANIMATION GENERATOR
 * Verify animation quality and creative freedom
 */
async function testAnimationGenerator(
  description: string,
  topic: string,
  animationType: string
): Promise<AnimationGeneratorTest> {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`🎬 TESTING ANIMATION GENERATOR`);
  logger.info(`Topic: ${topic}`);
  logger.info(`Type: ${animationType}`);
  logger.info(`Description: ${description}`);
  logger.info(`${'='.repeat(80)}`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  try {
    const svgCode = await generateSVGAnimation(topic, description, animationType, apiKey);
    
    logger.info(`\n📊 Generated SVG (${svgCode.length} characters)`);
    
    // Analyze quality
    const quality = analyzeAnimationQuality(svgCode);
    
    logger.info(`\n📈 QUALITY METRICS:`);
    logger.info(`   Has Animations: ${quality.hasAnimations ? 'YES ✅' : 'NO ❌'}`);
    logger.info(`   Animation Count: ${quality.animationCount}`);
    logger.info(`   Loops Indefinitely: ${quality.loopsIndefinitely ? 'YES ✅' : 'NO ❌'}`);
    logger.info(`   Label Count: ${quality.labelCount}`);
    logger.info(`   Uses Advanced SVG: ${quality.usesAdvancedSVG ? 'YES ✅' : 'NO ❌'}`);
    
    if (quality.issues.length > 0) {
      logger.warn(`\n⚠️  ISSUES DETECTED:`);
      quality.issues.forEach(issue => logger.warn(`   - ${issue}`));
    } else {
      logger.info(`\n✅ NO ISSUES - Animation is excellent!`);
    }

    // Save SVG for visual inspection
    const filename = `animation-${animationType}-${Date.now()}.svg`;
    const outputPath = path.join(__dirname, 'test-output-quality', filename);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, svgCode);
    logger.info(`\n💾 Saved to: ${filename}`);

    return { description, topic, animationType, svgCode, quality };
  } catch (error: any) {
    logger.error(`❌ Generation failed: ${error.message}`);
    return {
      description,
      topic,
      animationType,
      svgCode: '',
      quality: {
        hasAnimations: false,
        animationCount: 0,
        loopsIndefinitely: false,
        labelCount: 0,
        usesAdvancedSVG: false,
        issues: [`Generation failed: ${error.message}`]
      }
    };
  }
}

/**
 * Analyze animation quality
 */
function analyzeAnimationQuality(svgCode: string): {
  hasAnimations: boolean;
  animationCount: number;
  loopsIndefinitely: boolean;
  labelCount: number;
  usesAdvancedSVG: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for SMIL animations
  const animationTags = ['<animate', '<animateTransform', '<animateMotion'];
  const animationCount = animationTags.reduce((sum, tag) => {
    return sum + (svgCode.match(new RegExp(tag, 'g')) || []).length;
  }, 0);
  
  const hasAnimations = animationCount > 0;
  
  if (!hasAnimations) {
    issues.push('No SMIL animations found - this should be animated!');
  }
  
  // Check for infinite looping
  const loopsIndefinitely = svgCode.includes('repeatCount="indefinite"');
  
  if (hasAnimations && !loopsIndefinitely) {
    issues.push('Animations don\'t loop indefinitely - need repeatCount="indefinite"');
  }
  
  // Check labels
  const labelCount = (svgCode.match(/<text/g) || []).length;
  
  if (labelCount < 2) {
    issues.push(`Insufficient labels (${labelCount}) - need at least 2-3`);
  }
  
  // Check for advanced SVG features
  const advancedFeatures = ['<defs>', '<use', '<g id=', '<path d='];
  const usesAdvancedSVG = advancedFeatures.some(feature => svgCode.includes(feature));
  
  if (!usesAdvancedSVG) {
    issues.push('Animation too simple - no defs, groups, or complex paths');
  }
  
  // Check for basic shapes only (sign of low quality)
  const hasOnlyBasicShapes = 
    !svgCode.includes('<path') &&
    !svgCode.includes('<defs>') &&
    (svgCode.includes('<circle') || svgCode.includes('<rect'));
  
  if (hasOnlyBasicShapes) {
    issues.push('Only basic shapes (circles/rects) - needs complex paths');
  }
  
  return {
    hasAnimations,
    animationCount,
    loopsIndefinitely,
    labelCount,
    usesAdvancedSVG,
    issues
  };
}

/**
 * RUN ALL TESTS
 */
async function runDeepDiveTests() {
  logger.info(`\n${'█'.repeat(80)}`);
  logger.info(`🔬 DEEP QUALITY UNIT TESTING - Finding Root Causes`);
  logger.info(`${'█'.repeat(80)}`);

  const results = {
    subplanner: [] as SubPlannerTest[],
    static: [] as StaticGeneratorTest[],
    animation: [] as AnimationGeneratorTest[]
  };

  // Test each domain
  for (const testCase of TEST_TOPICS) {
    try {
      // Test subplanner
      const subplannerResult = await testSubPlanner(testCase);
      results.subplanner.push(subplannerResult);

      // Wait to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test static generator with first static spec
      const staticSpec = subplannerResult.specs.find(s => s.type === 'static');
      if (staticSpec) {
        const staticResult = await testStaticGenerator(staticSpec.description, testCase.topic);
        results.static.push(staticResult);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Test animation generator with first animation spec
      const animSpec = subplannerResult.specs.find(s => s.type === 'animation');
      if (animSpec && animSpec.animationType) {
        const animResult = await testAnimationGenerator(
          animSpec.description,
          testCase.topic,
          animSpec.animationType
        );
        results.animation.push(animResult);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error: any) {
      logger.error(`❌ Test failed for ${testCase.topic}: ${error.message}`);
    }
  }

  // Generate comprehensive report
  generateQualityReport(results);
}

/**
 * Generate final quality report
 */
function generateQualityReport(results: {
  subplanner: SubPlannerTest[];
  static: StaticGeneratorTest[];
  animation: AnimationGeneratorTest[];
}) {
  logger.info(`\n${'█'.repeat(80)}`);
  logger.info(`📊 FINAL QUALITY REPORT`);
  logger.info(`${'█'.repeat(80)}`);

  // Subplanner analysis
  logger.info(`\n🧪 SUBPLANNER RESULTS (${results.subplanner.length} tests):`);
  const avgClarity = results.subplanner.reduce((sum, r) => sum + r.quality.clarity, 0) / results.subplanner.length;
  const avgSpecificity = results.subplanner.reduce((sum, r) => sum + r.quality.specificity, 0) / results.subplanner.length;
  const avgActionable = results.subplanner.reduce((sum, r) => sum + r.quality.actionable, 0) / results.subplanner.length;
  const totalSubIssues = results.subplanner.reduce((sum, r) => sum + r.quality.issues.length, 0);

  logger.info(`   Average Clarity: ${avgClarity.toFixed(1)}/100 ${avgClarity >= 80 ? '✅' : '❌'}`);
  logger.info(`   Average Specificity: ${avgSpecificity.toFixed(1)}/100 ${avgSpecificity >= 80 ? '✅' : '❌'}`);
  logger.info(`   Average Actionable: ${avgActionable.toFixed(1)}/100 ${avgActionable >= 80 ? '✅' : '❌'}`);
  logger.info(`   Total Issues: ${totalSubIssues}`);

  // Static generator analysis
  logger.info(`\n🎨 STATIC GENERATOR RESULTS (${results.static.length} tests):`);
  const avgOps = results.static.reduce((sum, r) => sum + r.quality.operationCount, 0) / results.static.length;
  const avgDiversity = results.static.reduce((sum, r) => sum + r.quality.diversity, 0) / results.static.length;
  const avgContext = results.static.reduce((sum, r) => sum + r.quality.contextRelevance, 0) / results.static.length;
  const advancedOpsCount = results.static.filter(r => r.quality.hasAdvancedOps).length;
  const totalStaticIssues = results.static.reduce((sum, r) => sum + r.quality.issues.length, 0);

  logger.info(`   Average Operations: ${avgOps.toFixed(1)} ${avgOps >= 8 ? '✅' : '❌'}`);
  logger.info(`   Average Diversity: ${avgDiversity.toFixed(1)}/100 ${avgDiversity >= 60 ? '✅' : '❌'}`);
  logger.info(`   Average Context: ${avgContext.toFixed(1)}/100 ${avgContext >= 50 ? '✅' : '❌'}`);
  logger.info(`   Advanced Ops: ${advancedOpsCount}/${results.static.length} ${advancedOpsCount === results.static.length ? '✅' : '❌'}`);
  logger.info(`   Total Issues: ${totalStaticIssues}`);

  // Animation generator analysis
  logger.info(`\n🎬 ANIMATION GENERATOR RESULTS (${results.animation.length} tests):`);
  const withAnimations = results.animation.filter(r => r.quality.hasAnimations).length;
  const withLoops = results.animation.filter(r => r.quality.loopsIndefinitely).length;
  const avgLabels = results.animation.reduce((sum, r) => sum + r.quality.labelCount, 0) / results.animation.length;
  const withAdvanced = results.animation.filter(r => r.quality.usesAdvancedSVG).length;
  const totalAnimIssues = results.animation.reduce((sum, r) => sum + r.quality.issues.length, 0);

  logger.info(`   Has Animations: ${withAnimations}/${results.animation.length} ${withAnimations === results.animation.length ? '✅' : '❌'}`);
  logger.info(`   Loops Indefinitely: ${withLoops}/${results.animation.length} ${withLoops === results.animation.length ? '✅' : '❌'}`);
  logger.info(`   Average Labels: ${avgLabels.toFixed(1)} ${avgLabels >= 2 ? '✅' : '❌'}`);
  logger.info(`   Advanced SVG: ${withAdvanced}/${results.animation.length} ${withAdvanced === results.animation.length ? '✅' : '❌'}`);
  logger.info(`   Total Issues: ${totalAnimIssues}`);

  // Root cause identification
  logger.info(`\n${'█'.repeat(80)}`);
  logger.info(`🎯 ROOT CAUSE ANALYSIS`);
  logger.info(`${'█'.repeat(80)}`);

  const totalIssues = totalSubIssues + totalStaticIssues + totalAnimIssues;
  logger.info(`\nTotal Issues Found: ${totalIssues}`);
  
  if (totalSubIssues > 0) {
    logger.warn(`\n⚠️  SUBPLANNER ISSUES (${totalSubIssues} total):`);
    logger.warn(`   Root Cause: Descriptions may be too vague or lack specificity`);
    logger.warn(`   Impact: Generators receive unclear guidance`);
    logger.warn(`   Fix: Enhance subplanner prompt to be more specific`);
  }
  
  if (totalStaticIssues > 0) {
    logger.warn(`\n⚠️  STATIC GENERATOR ISSUES (${totalStaticIssues} total):`);
    logger.warn(`   Root Cause: May have restrictions or unclear prompts`);
    logger.warn(`   Impact: Low quality, generic visuals, lack of creativity`);
    logger.warn(`   Fix: Review prompt, remove restrictions, increase creative freedom`);
  }
  
  if (totalAnimIssues > 0) {
    logger.warn(`\n⚠️  ANIMATION GENERATOR ISSUES (${totalAnimIssues} total):`);
    logger.warn(`   Root Cause: May lack examples or creative freedom`);
    logger.warn(`   Impact: Simple animations, missing features`);
    logger.warn(`   Fix: Enhance prompt with better examples, increase freedom`);
  }

  if (totalIssues === 0) {
    logger.info(`\n✅ NO ISSUES FOUND - All generators working perfectly!`);
  }

  // Save detailed report
  const reportPath = path.join(__dirname, 'test-output-quality', 'quality-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  logger.info(`\n💾 Detailed report saved to: quality-report.json`);
}

// Run tests
runDeepDiveTests().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
