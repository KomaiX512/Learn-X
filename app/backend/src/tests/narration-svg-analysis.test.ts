/**
 * UNIT TEST: Narration Generator - SVG Operation Analysis
 * 
 * Verifies that narration generator analyzes actual SVG operations
 * and generates detailed, visual-specific narrations.
 * 
 * SUCCESS CRITERIA:
 * 1. Narration mentions specific colors from operations
 * 2. Narration mentions positions (left, right, center)
 * 3. Narration explains what each element represents
 * 4. Narration is 150+ words (detailed)
 * 5. No generic phrases like "this diagram shows"
 */

import { generateStepNarration } from '../agents/narrationGenerator';
import type { VisualInput } from '../agents/narrationGenerator';
import { PlanStep, Action } from '../types';

// Test case: RC Circuit visualization with specific colored components
const testStep: PlanStep = {
  id: 1,
  desc: 'RC Circuit Time Constant and Charging Behavior',
  compiler: 'js',
  complexity: 5
};

const testTopic = 'RC Circuits in Electronics';

// Realistic SVG operations from visual generator
const testActions: any[] = [
  { op: 'drawRect', x: 100, y: 200, width: 80, height: 50, color: '#3498db', label: 'Voltage Source' },
  { op: 'drawCircle', x: 300, y: 225, radius: 30, color: '#e74c3c', label: 'R1 (10kΩ)' },
  { op: 'drawRect', x: 500, y: 200, width: 60, height: 50, color: '#f39c12', label: 'C1 (100µF)' },
  { op: 'drawLine', x1: 180, y1: 225, x2: 270, y2: 225, color: '#2c3e50', width: 3 },
  { op: 'drawLine', x1: 330, y1: 225, x2: 500, y2: 225, color: '#2c3e50', width: 3 },
  { op: 'drawSignalWaveform', waveform: 'exponential', x: 100, y: 400, width: 500, amplitude: 80, color: '#27ae60', label: 'Capacitor Voltage' },
  { op: 'drawVector', x1: 200, y1: 225, x2: 250, y2: 225, color: '#e67e22', label: 'Current Flow' },
  { op: 'drawLabel', text: 'τ = RC', x: 400, y: 500, color: '#9b59b6', fontSize: 24 },
  { op: 'drawLabel', text: 'Time Constant', x: 400, y: 530, color: '#7f8c8d', fontSize: 16 },
  { op: 'drawCircuitElement', type: 'ground', x: 300, y: 300, label: 'GND' },
  { op: 'drawRect', x: 50, y: 150, width: 600, height: 250, color: 'none' },
  { op: 'drawLabel', text: 'RC Charging Circuit', x: 350, y: 130, color: '#2c3e50', fontSize: 20, bold: true }
];

const testVisuals: VisualInput[] = [
  {
    type: 'animation',
    visualNumber: 1,
    actionCount: testActions.length,
    actions: testActions,
    description: 'RC Circuit Time Constant'
  }
];

async function runTest() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 NARRATION GENERATOR - SVG OPERATION ANALYSIS TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Test Setup:');
  console.log(`   - Topic: ${testTopic}`);
  console.log(`   - Step: ${testStep.desc}`);
  console.log(`   - Visuals: ${testVisuals.length} animation(s)`);
  console.log(`   - Operations: ${testVisuals[0].actions?.length || 0} SVG operations`);
  console.log('');

  console.log('📋 SVG Operations Being Analyzed:');
  testVisuals[0].actions?.forEach((action: any, idx: number) => {
    const opStr = `${action.op}`;
    const details: string[] = [];
    if (action.color) details.push(`color=${action.color}`);
    if (action.label) details.push(`label="${action.label}"`);
    if (action.x !== undefined) details.push(`x=${action.x}`);
    console.log(`   ${idx + 1}. ${opStr}${details.length > 0 ? ` (${details.join(', ')})` : ''}`);
  });
  console.log('');

  try {
    console.log('🚀 Generating narration with SVG operation analysis...\n');
    const startTime = Date.now();
    
    const result = await generateStepNarration(testStep, testTopic, testVisuals);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Narration generated in ${(elapsed / 1000).toFixed(2)}s\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 GENERATED NARRATION:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const narration = result.narrations[0];
    console.log(narration.narration);
    console.log('');

    // Validate narration quality
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 QUALITY VALIDATION:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const wordCount = narration.narration.split(/\s+/).length;
    const text = narration.narration.toLowerCase();

    // Test 1: Word count (should be detailed)
    const test1 = wordCount >= 150;
    console.log(`Test 1: Word Count (${wordCount}/150 words): ${test1 ? '✅ PASS' : '❌ FAIL'}`);

    // Test 2: Color mentions (operation-aware)
    const mentionsColor = /blue|red|orange|yellow|green|purple/.test(text) ||
                          /#[0-9a-f]{6}/.test(text);
    console.log(`Test 2: Mentions Colors: ${mentionsColor ? '✅ PASS' : '❌ FAIL'}`);

    // Test 3: Position references (spatial awareness)
    const mentionsPosition = /left|right|center|top|bottom|middle|corner|side/.test(text);
    console.log(`Test 3: Describes Positions: ${mentionsPosition ? '✅ PASS' : '❌ FAIL'}`);

    // Test 4: Component mentions (understands circuit)
    const mentionsComponents = (text.includes('resistor') || text.includes('r1')) &&
                               (text.includes('capacitor') || text.includes('c1')) &&
                               text.includes('voltage');
    console.log(`Test 4: Identifies Components: ${mentionsComponents ? '✅ PASS' : '❌ FAIL'}`);

    // Test 5: Visual guidance phrases
    const hasVisualGuidance = /see (this|that|the)|notice (how|the)|look at|observe/.test(text);
    console.log(`Test 5: Visual Guidance ("see this"): ${hasVisualGuidance ? '✅ PASS' : '❌ FAIL'}`);

    // Test 6: Avoids generic phrases
    const avoidsGeneric = !text.includes('this diagram shows') &&
                          !text.includes('the image displays') &&
                          !text.includes('as you can see');
    console.log(`Test 6: Avoids Generic Phrases: ${avoidsGeneric ? '✅ PASS' : '❌ FAIL'}`);

    // Test 7: Educational explanation
    const hasExplanation = text.includes('why') || text.includes('because') || 
                           text.includes('this is') || text.includes('represents') ||
                           text.includes('demonstrates');
    console.log(`Test 7: Provides Explanation: ${hasExplanation ? '✅ PASS' : '❌ FAIL'}`);

    const allTestsPassed = test1 && mentionsColor && mentionsPosition && 
                          mentionsComponents && hasVisualGuidance && 
                          avoidsGeneric && hasExplanation;

    console.log('\n═══════════════════════════════════════════════════════════════');
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED - Narration is operation-aware and detailed!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Review narration quality');
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Additional metrics
    console.log('📊 Narration Metrics:');
    console.log(`   - Word Count: ${wordCount} words`);
    console.log(`   - Estimated Duration: ${narration.duration || 'N/A'}s`);
    console.log(`   - Sentence Count: ${(narration.narration.match(/[.!?]+/g) || []).length}`);
    console.log(`   - Tests Passed: ${[test1, mentionsColor, mentionsPosition, mentionsComponents, hasVisualGuidance, avoidsGeneric, hasExplanation].filter(t => t).length}/7`);
    console.log('');

    process.exit(allTestsPassed ? 0 : 1);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
runTest();
