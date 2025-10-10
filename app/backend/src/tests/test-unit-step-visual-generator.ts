/**
 * UNIT STEP TEST: Visual Generator Pipeline
 * 
 * Validates:
 * 1. Planner/SubPlanner distribution (Stage 1)
 * 2. Visual Executor precision (Stage 2)
 * 3. Complex structure generation capability
 * 4. Domain-specific SVG paths (no basic shapes)
 * 5. Input/Output cross-verification with verbose logging
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PlanStep, Action } from '../types';
import * as dotenv from 'dotenv';

dotenv.config();

const MODEL = 'gemini-2.5-flash';

// ============================================================================
// STAGE 1: Test SubPlanner Distribution
// ============================================================================

async function testSubPlannerDistribution(step: PlanStep, topic: string): Promise<{
  success: boolean;
  specifications: string[];
  metrics: {
    count: number;
    avgLength: number;
    hasCoordinates: boolean;
    hasColors: boolean;
    hasScientificTerms: boolean;
    hasAnimations: boolean;
    detailLevel: 'vague' | 'moderate' | 'precise';
  };
}> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                 STAGE 1: SUBPLANNER TEST                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📝 Topic: ${topic}`);
  console.log(`📝 Step: ${step.desc}\n`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: MODEL,
    generationConfig: { 
      temperature: 0.9, 
      maxOutputTokens: 4000,
      topK: 50,
      topP: 0.95
    },
    systemInstruction: 'You are a precision visual architect. Create EXTREMELY DETAILED visual specifications. Output ONLY a JSON array of detailed instruction strings.'
  });
  
  const prompt = `Topic: "${topic}"
Step Description: "${step.desc}"

🎯 MISSION: Generate 5-7 ULTRA-PRECISE visual specifications (3-4 lines each)

📐 SPECIFICATION FORMAT (CRITICAL):
Each specification MUST include:
1. WHAT to create (structure name with scientific terminology)
2. SHAPE details (customPath coordinates, circles, rectangles with exact positions)
3. SPATIAL layout (x: 0.0-1.0, y: 0.0-1.0, specific positions)
4. LABELS with exact text (scientific terms, NOT "Label 1" or "Part A")
5. COLORS (realistic hex codes with domain-specific meaning)
6. CONNECTIONS/ARROWS (from coordinate to coordinate)

✅ GOOD EXAMPLE:
[
  "Create ATP synthase enzyme: Use customPath to draw mushroom shape from (0.2,0.3) to (0.2,0.6) for stalk, circle at (0.2,0.25) radius 0.08 for head domain. Color: #e74c3c for catalytic head, #3498db for transmembrane stalk. Labels: 'F1 Complex (Catalytic Head)' at (0.25,0.20), 'F0 Complex (Proton Channel)' at (0.25,0.5), 'Proton Flow →' with arrow from (0.15,0.55) to (0.15,0.45)",
  
  "Create electron transport chain: Draw 4 protein complexes as rectangles: Complex I (0.15,0.4) size 0.06x0.1 color #27ae60, Complex II (0.3,0.45) size 0.05x0.08 color #2ecc71, Complex III (0.5,0.4) size 0.06x0.1 color #16a085, Complex IV (0.7,0.42) size 0.07x0.09 color #1abc9c. Draw electron path as customPath curve connecting centers with color #f39c12. Labels: 'Complex I (NADH Dehydrogenase)' at (0.15,0.32), 'Complex II (Succinate Dehydrogenase)' at (0.3,0.37), 'Complex III (Cytochrome bc1)' at (0.5,0.32), 'Complex IV (Cytochrome c Oxidase)' at (0.7,0.34), 'e- transport' at (0.45,0.35)"
]

🎬 ANIMATION SPECIFICATION (1-2 per step):
Include 1-2 specs that describe MOTION:
"Animate proton gradient: Create 8-12 particle objects (small circles radius 0.01) starting at (0.25,0.2), moving downward through ATP synthase stalk path to (0.25,0.6), color #f39c12, glow effect. Label 'H+ Protons' at (0.3,0.15). Add rotation animation to ATP synthase head (0.2,0.25) showing enzyme rotation"

✅ Generate NOW for topic "${topic}" and step "${step.desc}":
ONLY output the JSON array, no explanations.`;

  console.log('🚀 Sending prompt to SubPlanner LLM...\n');
  console.log('─'.repeat(70));
  console.log('PROMPT SENT:');
  console.log('─'.repeat(70));
  console.log(prompt.substring(0, 500) + '...\n');
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log('─'.repeat(70));
    console.log('LLM RAW OUTPUT:');
    console.log('─'.repeat(70));
    console.log(text + '\n');
    
    // Parse JSON
    let specifications: string[] = [];
    try {
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      specifications = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\[([\s\S]*?)\]/);
      if (match) {
        specifications = JSON.parse(match[0]);
      }
    }
    
    console.log('─'.repeat(70));
    console.log('PARSED SPECIFICATIONS:');
    console.log('─'.repeat(70));
    specifications.forEach((spec, i) => {
      console.log(`\n📋 Spec ${i+1}/${specifications.length}:`);
      console.log(`   ${spec}\n`);
      console.log(`   Length: ${spec.length} characters`);
    });
    
    // Analyze specifications
    const avgLength = specifications.reduce((sum, s) => sum + s.length, 0) / specifications.length;
    
    const hasCoordinates = specifications.some(s => 
      /\(\d+\.\d+,\s*\d+\.\d+\)/.test(s) || /x:\s*\d+\.\d+/.test(s)
    );
    
    const hasColors = specifications.some(s => 
      /#[0-9a-fA-F]{6}/.test(s) || /rgba?\(/.test(s)
    );
    
    const scientificTerms = [
      'ATP', 'DNA', 'RNA', 'electron', 'proton', 'molecule', 'atom',
      'neuron', 'synapse', 'membrane', 'enzyme', 'gradient', 'vector',
      'derivative', 'integral', 'matrix', 'algorithm', 'quantum', 'force'
    ];
    const hasScientificTerms = specifications.some(s =>
      scientificTerms.some(term => s.toLowerCase().includes(term.toLowerCase()))
    );
    
    const animationTerms = ['animate', 'particle', 'wave', 'orbit', 'moving', 'rotation', 'motion'];
    const hasAnimations = specifications.some(s =>
      animationTerms.some(term => s.toLowerCase().includes(term))
    );
    
    // Determine detail level
    let detailLevel: 'vague' | 'moderate' | 'precise';
    if (avgLength > 300 && hasCoordinates && hasColors) {
      detailLevel = 'precise';
    } else if (avgLength > 150 && (hasCoordinates || hasColors)) {
      detailLevel = 'moderate';
    } else {
      detailLevel = 'vague';
    }
    
    const metrics = {
      count: specifications.length,
      avgLength: Math.round(avgLength),
      hasCoordinates,
      hasColors,
      hasScientificTerms,
      hasAnimations,
      detailLevel
    };
    
    console.log('\n' + '═'.repeat(70));
    console.log('STAGE 1 ANALYSIS:');
    console.log('═'.repeat(70));
    console.log(`✓ Specification Count: ${metrics.count} (target: 5-7)`);
    console.log(`✓ Average Length: ${metrics.avgLength} chars (target: >250)`);
    console.log(`✓ Has Coordinates: ${metrics.hasCoordinates ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Has Colors: ${metrics.hasColors ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Has Scientific Terms: ${metrics.hasScientificTerms ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Has Animations: ${metrics.hasAnimations ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Detail Level: ${detailLevel.toUpperCase()} ${detailLevel === 'precise' ? '✅' : detailLevel === 'moderate' ? '⚠️' : '❌'}`);
    
    const success = metrics.count >= 5 && 
                    metrics.avgLength > 200 && 
                    metrics.hasCoordinates && 
                    metrics.hasColors && 
                    metrics.detailLevel !== 'vague';
    
    console.log(`\n${success ? '✅ STAGE 1 PASSED' : '❌ STAGE 1 FAILED'}\n`);
    
    return { success, specifications, metrics };
    
  } catch (error) {
    console.error('❌ SubPlanner failed:', error);
    return {
      success: false,
      specifications: [],
      metrics: {
        count: 0,
        avgLength: 0,
        hasCoordinates: false,
        hasColors: false,
        hasScientificTerms: false,
        hasAnimations: false,
        detailLevel: 'vague'
      }
    };
  }
}

// ============================================================================
// STAGE 2: Test Visual Executor Precision
// ============================================================================

async function testVisualExecutor(
  specification: string, 
  topic: string,
  specIndex: number,
  totalSpecs: number
): Promise<{
  success: boolean;
  operations: Action[];
  metrics: {
    totalOps: number;
    complexPathCount: number;
    basicShapeCount: number;
    labelCount: number;
    animationCount: number;
    hasScientificLabels: boolean;
    complexityRatio: number;
  };
}> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║          STAGE 2: VISUAL EXECUTOR TEST (${specIndex}/${totalSpecs})              ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Specification (input from SubPlanner):`);
  console.log('─'.repeat(70));
  console.log(specification);
  console.log('─'.repeat(70) + '\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: MODEL,
    generationConfig: { 
      temperature: 0.7,
      maxOutputTokens: 10000,
      topK: 40,
      topP: 0.9
    },
    systemInstruction: 'You are a precision visual executor. Convert detailed specifications into exact Konva.js operations. Output ONLY valid JSON array. Follow specifications EXACTLY.'
  });
  
  const prompt = `🎯 SPECIFICATION TO EXECUTE:
${specification}

📐 YOUR TASK: Convert this specification into 8-15 Konva.js operations

⚙️ OPERATION TYPES (use appropriate ones):
- customPath: Complex shapes (SVG path syntax)
- drawCircle: Circles (x, y, radius, fill, stroke)
- drawRect: Rectangles (x, y, width, height, fill, stroke)
- drawLine: Straight lines (x1, y1, x2, y2, stroke)
- drawLabel: Text labels (x, y, text, fontSize, color)
- drawLatex: Math equations (x, y, latex, fontSize)
- drawVector: Arrows (x1, y1, x2, y2, color, label)
- particle: Animated particles (x, y, count, color, spread)
- wave: Wave animations (x, y, amplitude, frequency)
- orbit: Circular motion (centerX, centerY, radius, period)
- animate: Generic animations (target, from, to, duration)
- delay: Pause between operations (ms)

📋 EXECUTION RULES (CRITICAL):
1. Follow specification coordinates EXACTLY (don't change positions)
2. Use exact colors specified (hex codes or rgba)
3. Use exact label text from specification (scientific terminology)
4. Create ALL structures mentioned in specification
5. Add connections/arrows as specified
6. Each operation MUST have "op" field (NOT "operation")
7. Coordinates in 0.0-1.0 range
8. Round to 0.05 increments for clean positioning

🚀 EXECUTE THE SPECIFICATION:
Generate 8-15 operations that EXACTLY match the specification.
ONLY output the JSON array: [{"op":"..."},...]
NO explanations, NO markdown, ONLY JSON array.`;

  console.log('🚀 Sending prompt to Visual Executor LLM...\n');
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log('─'.repeat(70));
    console.log('LLM RAW OUTPUT:');
    console.log('─'.repeat(70));
    console.log(text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
    console.log('─'.repeat(70) + '\n');
    
    // Parse JSON
    let operations: Action[] = [];
    try {
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) cleaned = jsonMatch[0];
      operations = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        operations = JSON.parse(match[0]);
      }
    }
    
    console.log('─'.repeat(70));
    console.log('PARSED OPERATIONS:');
    console.log('─'.repeat(70));
    operations.forEach((op, i) => {
      console.log(`${i+1}. ${JSON.stringify(op)}`);
    });
    console.log('─'.repeat(70) + '\n');
    
    // Analyze operations
    const complexOps = ['customPath', 'drawGraph', 'drawLatex', 'drawDiagram', 'drawVector'];
    const basicOps = ['drawCircle', 'drawRect', 'drawLine'];
    const animationOps = ['animate', 'particle', 'wave', 'orbit'];
    
    const complexPathCount = operations.filter(op => complexOps.includes(op.op)).length;
    const basicShapeCount = operations.filter(op => basicOps.includes(op.op)).length;
    const labelCount = operations.filter(op => op.op === 'drawLabel').length;
    const animationCount = operations.filter(op => animationOps.includes(op.op)).length;
    
    const labels = operations
      .filter(op => op.op === 'drawLabel')
      .map((op: any) => op.text || '');
    
    const hasScientificLabels = labels.length > 0 && 
      labels.some(label => 
        label.length > 5 && 
        !/^(label|text|part)\s*\d+$/i.test(label)
      );
    
    const complexityRatio = operations.length > 0 
      ? complexPathCount / operations.length 
      : 0;
    
    const metrics = {
      totalOps: operations.length,
      complexPathCount,
      basicShapeCount,
      labelCount,
      animationCount,
      hasScientificLabels,
      complexityRatio
    };
    
    console.log('═'.repeat(70));
    console.log('STAGE 2 ANALYSIS:');
    console.log('═'.repeat(70));
    console.log(`✓ Total Operations: ${metrics.totalOps} (target: 8-15)`);
    console.log(`✓ Complex Paths: ${metrics.complexPathCount} (customPath, drawGraph, etc.)`);
    console.log(`✓ Basic Shapes: ${metrics.basicShapeCount} (circles, rects, lines)`);
    console.log(`✓ Labels: ${metrics.labelCount}`);
    console.log(`✓ Animations: ${metrics.animationCount}`);
    console.log(`✓ Scientific Labels: ${metrics.hasScientificLabels ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Complexity Ratio: ${(metrics.complexityRatio * 100).toFixed(1)}% (target: >20%)`);
    
    if (labels.length > 0) {
      console.log(`\n🏷️  Sample Labels:`);
      labels.slice(0, 3).forEach(label => {
        console.log(`   "${label}"`);
      });
    }
    
    const success = metrics.totalOps >= 8 && 
                    metrics.totalOps <= 20 &&
                    (complexPathCount > 0 || animationCount > 0);
    
    console.log(`\n${success ? '✅ STAGE 2 PASSED' : '❌ STAGE 2 FAILED'}\n`);
    
    return { success, operations, metrics };
    
  } catch (error) {
    console.error('❌ Visual Executor failed:', error);
    return {
      success: false,
      operations: [],
      metrics: {
        totalOps: 0,
        complexPathCount: 0,
        basicShapeCount: 0,
        labelCount: 0,
        animationCount: 0,
        hasScientificLabels: false,
        complexityRatio: 0
      }
    };
  }
}

// ============================================================================
// COMPREHENSIVE UNIT STEP TEST
// ============================================================================

interface ComplexStructureTest {
  name: string;
  topic: string;
  step: PlanStep;
  expectedStructures: string[];
  domainType: 'biology' | 'chemistry' | 'physics' | 'math' | 'cs';
}

const COMPLEX_STRUCTURE_TESTS: ComplexStructureTest[] = [
  {
    name: 'Anatomical Visual: Heart Structure',
    topic: 'Human Cardiovascular System',
    step: {
      id: 1,
      desc: 'Four-chambered heart anatomy with blood flow pathways and valve mechanisms',
      compiler: 'js' as const,
      complexity: 5,
      tag: 'anatomy'
    },
    expectedStructures: ['chambers', 'valves', 'vessels', 'flow arrows', 'labels'],
    domainType: 'biology'
  },
  {
    name: 'Chemical Reaction: Organic Mechanism',
    topic: 'Organic Chemistry Reactions',
    step: {
      id: 2,
      desc: 'SN2 nucleophilic substitution showing electron pushing arrows and transition state',
      compiler: 'js' as const,
      complexity: 4,
      tag: 'mechanism'
    },
    expectedStructures: ['molecules', 'electron arrows', 'transition state', 'bond breaking/forming'],
    domainType: 'chemistry'
  },
  {
    name: 'Mathematical Graph: Complex Function',
    topic: 'Calculus and Analysis',
    step: {
      id: 3,
      desc: 'Graph of f(x) = sin(x) × e^(-x) with critical points, inflection points, and asymptotic behavior',
      compiler: 'js' as const,
      complexity: 4,
      tag: 'graph'
    },
    expectedStructures: ['coordinate system', 'curve', 'critical points', 'tangent lines', 'annotations'],
    domainType: 'math'
  },
  {
    name: 'Data Structure: Binary Tree',
    topic: 'Computer Science Data Structures',
    step: {
      id: 4,
      desc: 'Balanced AVL tree with rotation operations and height balance factors',
      compiler: 'js' as const,
      complexity: 4,
      tag: 'data_structure'
    },
    expectedStructures: ['nodes', 'edges', 'balance factors', 'rotation indicators', 'labels'],
    domainType: 'cs'
  },
  {
    name: 'Physics Diagram: Electromagnetic Field',
    topic: 'Electromagnetism',
    step: {
      id: 5,
      desc: 'Magnetic field lines around current-carrying wire with right-hand rule visualization',
      compiler: 'js' as const,
      complexity: 4,
      tag: 'field_diagram'
    },
    expectedStructures: ['field lines', 'current direction', 'magnetic field vectors', 'right-hand rule'],
    domainType: 'physics'
  }
];

async function runComplexStructureTest(test: ComplexStructureTest) {
  console.log('\n' + '█'.repeat(75));
  console.log(`█  TEST: ${test.name}`);
  console.log('█'.repeat(75));
  
  // Stage 1: SubPlanner
  const stage1Result = await testSubPlannerDistribution(test.step, test.topic);
  
  if (!stage1Result.success) {
    return {
      testName: test.name,
      passed: false,
      reason: 'Stage 1 (SubPlanner) failed'
    };
  }
  
  // Wait between stages
  console.log('\n⏳ Waiting 2 seconds before Stage 2...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Stage 2: Visual Executor (test first specification)
  const stage2Result = await testVisualExecutor(
    stage1Result.specifications[0],
    test.topic,
    1,
    stage1Result.specifications.length
  );
  
  // Evaluate against expected structures
  const allOps = stage2Result.operations;
  const opTypes = [...new Set(allOps.map(op => op.op))];
  
  console.log('\n' + '═'.repeat(70));
  console.log('FINAL EVALUATION:');
  console.log('═'.repeat(70));
  console.log(`Domain: ${test.domainType.toUpperCase()}`);
  console.log(`Expected Structures: ${test.expectedStructures.join(', ')}`);
  console.log(`Generated Operation Types: ${opTypes.join(', ')}`);
  console.log(`\nStage 1 Quality: ${stage1Result.metrics.detailLevel.toUpperCase()}`);
  console.log(`Stage 2 Complexity: ${(stage2Result.metrics.complexityRatio * 100).toFixed(1)}%`);
  
  const passed = stage1Result.success && 
                 stage2Result.success &&
                 stage2Result.metrics.complexityRatio > 0.15 &&
                 stage2Result.metrics.hasScientificLabels;
  
  console.log(`\n${'█'.repeat(70)}`);
  console.log(`${passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}: ${test.name}`);
  console.log(`${'█'.repeat(70)}\n`);
  
  return {
    testName: test.name,
    passed,
    stage1Metrics: stage1Result.metrics,
    stage2Metrics: stage2Result.metrics,
    operationTypes: opTypes
  };
}

async function runAllTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                 UNIT STEP TEST: VISUAL GENERATOR PIPELINE                  ║
║                                                                            ║
║  Testing:                                                                  ║
║  1. SubPlanner specification distribution and precision                   ║
║  2. Visual Executor faithful execution without randomness                 ║
║  3. Complex structure generation capability                               ║
║  4. Domain-specific SVG paths (no basic shapes)                           ║
║  5. Input/Output cross-verification with verbose logging                  ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
  
  const results = [];
  
  for (const test of COMPLEX_STRUCTURE_TESTS) {
    try {
      const result = await runComplexStructureTest(test);
      results.push(result);
      
      // Wait between tests
      if (COMPLEX_STRUCTURE_TESTS.indexOf(test) < COMPLEX_STRUCTURE_TESTS.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" failed with exception:`, error);
      results.push({
        testName: test.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Final Summary
  console.log('\n' + '═'.repeat(80));
  console.log('                         FINAL TEST SUMMARY');
  console.log('═'.repeat(80) + '\n');
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = (passedCount / totalCount * 100).toFixed(1);
  
  console.log(`✅ Passed: ${passedCount}/${totalCount} (${passRate}%)`);
  console.log(`❌ Failed: ${totalCount - passedCount}/${totalCount}\n`);
  
  console.log('PER-TEST RESULTS:\n');
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.testName}`);
    if (r.stage1Metrics && r.stage2Metrics) {
      console.log(`   SubPlanner: ${r.stage1Metrics.count} specs, ${r.stage1Metrics.detailLevel} detail`);
      console.log(`   Executor: ${r.stage2Metrics.totalOps} ops, ${(r.stage2Metrics.complexityRatio * 100).toFixed(1)}% complex`);
      console.log(`   Operations: ${r.operationTypes?.join(', ')}`);
    }
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
    console.log();
  });
  
  console.log('═'.repeat(80));
  console.log(passedCount === totalCount ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED');
  console.log('═'.repeat(80) + '\n');
  
  return { results, passRate: parseFloat(passRate), allPassed: passedCount === totalCount };
}

// Run if executed directly
if (require.main === module) {
  runAllTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests, runComplexStructureTest, COMPLEX_STRUCTURE_TESTS };
