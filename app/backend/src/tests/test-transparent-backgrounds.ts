/**
 * TEST: Transparent Backgrounds (No Screenshot Look)
 * Verifies that generated SVGs have NO background rectangles
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { generateNotes } from '../agents/transcriptGenerator';
import { codegenV3WithRetry } from '../agents/codegenV3WithRetry';
import { PlanStep } from '../types';

async function testTransparentBackgrounds() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     TEST: Transparent Backgrounds (Blackboard Style)        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const testStep: PlanStep = {
    id: 1,
    desc: 'Visualize a quantum superposition state',
    notesSubtopic: 'Quantum Superposition',
    compiler: 'js',
    complexity: 2,
    tag: 'intuition'
  };
  
  const topic = 'Quantum Mechanics';
  
  // TEST 1: Notes Generator
  console.log('TEST 1: Notes Generator (should have NO background rectangles)');
  console.log('─'.repeat(70));
  
  const notes = await generateNotes(testStep, topic, testStep.desc);
  
  if (!notes) {
    console.log('❌ FAILED: Notes generation returned null');
    process.exit(1);
  }
  
  // Check for background rectangles (common patterns)
  const hasWhiteBackground = notes.includes('fill="white"') || notes.includes('fill="#fff');
  const hasColoredBackground = notes.match(/fill="(#[a-fA-F0-9]{6}|rgb\()/);
  const hasLargeRect = notes.match(/<rect[^>]*width="(1200|1000|800)"[^>]*height="(800|600|500)"/);
  
  console.log(`\nBackground Check:`);
  console.log(`  White background: ${hasWhiteBackground ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`  Colored background: ${hasColoredBackground ? '❌ FOUND' : '✅ NONE'}`);
  console.log(`  Large rect (likely bg): ${hasLargeRect ? '❌ FOUND' : '✅ NONE'}`);
  
  const notesClean = !hasWhiteBackground && !hasLargeRect;
  
  if (notesClean) {
    console.log('\n✅ PASSED: Notes have transparent background (blackboard style)');
  } else {
    console.log('\n⚠️ WARNING: Notes may have background elements');
    console.log('   This will make it look like a pasted screenshot');
  }
  
  // TEST 2: Visual Generator
  console.log('\n\nTEST 2: Visual Generator (should have NO background rectangles)');
  console.log('─'.repeat(70));
  
  const visual = await codegenV3WithRetry(testStep, topic);
  
  if (!visual || !visual.actions || visual.actions.length === 0) {
    console.log('❌ FAILED: Visual generation returned no actions');
    process.exit(1);
  }
  
  // Extract SVG from customSVG action
  const svgAction = visual.actions.find((a: any) => a.op === 'customSVG');
  if (!svgAction || !svgAction.svgCode) {
    console.log('⚠️ No customSVG action found, skipping visual check');
  } else {
    const svg = svgAction.svgCode;
    
    const hasWhiteBg = svg.includes('fill="white"') || svg.includes('fill="#fff');
    const hasColoredBg = svg.match(/fill="(#[a-fA-F0-9]{6}|rgb\()/);
    const hasLargeRectBg = svg.match(/<rect[^>]*width="(1200|1000|800)"[^>]*height="(800|600|500)"/);
    
    console.log(`\nBackground Check:`);
    console.log(`  White background: ${hasWhiteBg ? '❌ FOUND' : '✅ NONE'}`);
    console.log(`  Colored background: ${hasColoredBg ? '❌ FOUND' : '✅ NONE'}`);
    console.log(`  Large rect (likely bg): ${hasLargeRectBg ? '❌ FOUND' : '✅ NONE'}`);
    
    const visualClean = !hasWhiteBg && !hasLargeRectBg;
    
    if (visualClean) {
      console.log('\n✅ PASSED: Visual has transparent background (blackboard style)');
    } else {
      console.log('\n⚠️ WARNING: Visual may have background elements');
      console.log('   This will make it look like a pasted screenshot');
    }
  }
  
  // FINAL VERDICT
  console.log('\n' + '═'.repeat(70));
  console.log('FINAL VERDICT');
  console.log('═'.repeat(70));
  
  if (notesClean) {
    console.log('✅ Notes: Transparent background (blackboard style)');
  } else {
    console.log('⚠️ Notes: May have background (screenshot style)');
  }
  
  console.log('\n💡 TIP: Transparent backgrounds make content look like it\'s being');
  console.log('   drawn on a blackboard, not pasted as screenshots!');
  console.log('');
  
  process.exit(notesClean ? 0 : 1);
}

if (require.main === module) {
  testTransparentBackgrounds().catch(error => {
    console.error('\n💥 TEST CRASHED:', error);
    process.exit(1);
  });
}
