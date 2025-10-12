/**
 * QUICK VERIFICATION TEST
 * Tests one topic to verify fixes are working
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { logger } from './src/logger';

dotenv.config({ path: path.join(__dirname, '.env') });

import { generateInsaneVisuals } from './src/agents/svgMasterGenerator';
import { generateSVGAnimation } from './src/agents/svgAnimationGenerator';
import { planVisualsEnhanced } from './src/agents/codegenV3';

async function quickTest() {
  const topic = "Blood Circulation in Human Heart";
  const step = { desc: "How blood flows through the chambers of the heart" } as any;
  
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`🧪 QUICK VERIFICATION TEST`);
  logger.info(`Topic: ${topic}`);
  logger.info(`${'='.repeat(80)}`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('Missing GEMINI_API_KEY');
    return;
  }
  
  // Test 1: Subplanner
  logger.info(`\n📋 TEST 1: Subplanner`);
  const specs = await planVisualsEnhanced(step, topic, apiKey);
  logger.info(`✅ Generated ${specs.length} specs`);
  specs.forEach((spec, i) => {
    logger.info(`   ${i + 1}. [${spec.type}] ${spec.description.substring(0, 60)}...`);
  });
  
  // Wait to avoid rate limit
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Static Generator
  logger.info(`\n🎨 TEST 2: Static Generator`);
  const staticSpec = specs.find(s => s.type === 'static');
  if (staticSpec) {
    try {
      const ops = await generateInsaneVisuals(topic, staticSpec.description, apiKey);
      logger.info(`✅ Generated ${ops.length} operations`);
      const opTypes = [...new Set(ops.map((op: any) => op.op))];
      logger.info(`   Operation types: ${opTypes.join(', ')}`);
      
      // Check for generic labels
      const labels = ops.filter((op: any) => op.op === 'drawLabel');
      const genericLabels = labels.filter((op: any) => 
        op.text?.match(/Label \d|Part [A-Z]|Concept|Visual/)
      );
      if (genericLabels.length > 0) {
        logger.warn(`⚠️  Found ${genericLabels.length} generic labels!`);
      } else {
        logger.info(`✅ No generic labels detected`);
      }
    } catch (error: any) {
      logger.error(`❌ Static generator failed: ${error.message}`);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Animation Generator
  logger.info(`\n🎬 TEST 3: Animation Generator`);
  const animSpec = specs.find(s => s.type === 'animation');
  if (animSpec && animSpec.animationType) {
    try {
      const svg = await generateSVGAnimation(
        topic,
        animSpec.description,
        animSpec.animationType,
        apiKey
      );
      logger.info(`✅ Generated animation (${svg.length} chars)`);
      
      const hasAnimations = /<animate/.test(svg);
      const loopsIndefinitely = /repeatCount="indefinite"/.test(svg);
      const labelCount = (svg.match(/<text/g) || []).length;
      
      logger.info(`   Has animations: ${hasAnimations ? '✅' : '❌'}`);
      logger.info(`   Loops indefinitely: ${loopsIndefinitely ? '✅' : '❌'}`);
      logger.info(`   Labels: ${labelCount}`);
    } catch (error: any) {
      logger.error(`❌ Animation generator failed: ${error.message}`);
    }
  }
  
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`✅ QUICK VERIFICATION COMPLETE`);
  logger.info(`${'='.repeat(80)}`);
}

quickTest().catch(error => {
  logger.error(`Test failed: ${error.message}`);
  process.exit(1);
});
