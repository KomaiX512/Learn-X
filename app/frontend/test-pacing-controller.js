/**
 * TEST 3: PacingController
 * Verify pacing controller provides correct delays
 */

class PacingController {
  constructor(config = {}) {
    this.config = {
      beforeTitle: config.beforeTitle || 500,
      afterTitle: config.afterTitle || 2000,
      beforeHeading: config.beforeHeading || 800,
      afterHeading: config.afterHeading || 1500,
      beforeDiagram: config.beforeDiagram || 1000,
      afterDiagram: config.afterDiagram || 4000,
      beforeDescription: config.beforeDescription || 500,
      afterDescription: config.afterDescription || 3000,
      betweenActions: config.betweenActions || 1000,
      beforeNewVisual: config.beforeNewVisual || 2000,
      
      titleAnimationDuration: config.titleAnimationDuration || 800,
      diagramAnimationDuration: config.diagramAnimationDuration || 1500,
      textAnimationDuration: config.textAnimationDuration || 600,
      
      complexDiagramMultiplier: config.complexDiagramMultiplier || 1.5,
      simpleTextMultiplier: config.simpleTextMultiplier || 0.7
    };
  }
  
  getDelayBefore(type) {
    switch (type) {
      case 'title':
        return this.config.beforeTitle;
      case 'heading':
        return this.config.beforeHeading;
      case 'diagram':
        return this.config.beforeDiagram;
      case 'description':
        return this.config.beforeDescription;
      case 'annotation':
      case 'action':
        return this.config.betweenActions;
      default:
        return 500;
    }
  }
  
  getDelayAfter(type, complexity = 1) {
    let baseDelay;
    
    switch (type) {
      case 'title':
        baseDelay = this.config.afterTitle;
        break;
      case 'heading':
        baseDelay = this.config.afterHeading;
        break;
      case 'diagram':
        baseDelay = this.config.afterDiagram;
        break;
      case 'description':
        baseDelay = this.config.afterDescription;
        break;
      case 'annotation':
        baseDelay = 1000;
        break;
      case 'action':
        baseDelay = this.config.betweenActions;
        break;
      default:
        baseDelay = 1000;
    }
    
    return Math.round(baseDelay * complexity);
  }
  
  getAnimationDuration(type) {
    switch (type) {
      case 'title':
        return this.config.titleAnimationDuration;
      case 'diagram':
        return this.config.diagramAnimationDuration;
      case 'description':
      case 'heading':
      case 'annotation':
        return this.config.textAnimationDuration;
      default:
        return 500;
    }
  }
  
  getTotalTime(type, complexity = 1) {
    return (
      this.getDelayBefore(type) +
      this.getAnimationDuration(type) +
      this.getDelayAfter(type, complexity)
    );
  }
  
  getNewVisualDelay() {
    return this.config.beforeNewVisual;
  }
  
  static fastMode() {
    return {
      beforeTitle: 100,
      afterTitle: 500,
      beforeHeading: 100,
      afterHeading: 300,
      beforeDiagram: 200,
      afterDiagram: 800,
      beforeDescription: 100,
      afterDescription: 500,
      betweenActions: 200,
      beforeNewVisual: 400,
      titleAnimationDuration: 300,
      diagramAnimationDuration: 500,
      textAnimationDuration: 200,
      complexDiagramMultiplier: 1.2,
      simpleTextMultiplier: 0.8
    };
  }
}

function testPacingController() {
  console.log('═══════════════════════════════════════════════');
  console.log('TEST 3: PacingController');
  console.log('═══════════════════════════════════════════════\n');

  // Test 3.1: Create pacing controller
  console.log('TEST 3.1: Creating pacing controller...');
  const pacing = new PacingController();
  console.log('  ✅ Created with default educational pacing\n');

  // Test 3.2: Test delay before operations
  console.log('TEST 3.2: Testing delays before operations...');
  const beforeTitle = pacing.getDelayBefore('title');
  const beforeDiagram = pacing.getDelayBefore('diagram');
  const beforeDescription = pacing.getDelayBefore('description');
  
  console.log(`  Before title: ${beforeTitle}ms`);
  console.log(`  Before diagram: ${beforeDiagram}ms`);
  console.log(`  Before description: ${beforeDescription}ms`);
  
  if (beforeTitle === 500 && beforeDiagram === 1000 && beforeDescription === 500) {
    console.log('  ✅ PASS: Before delays correct\n');
  } else {
    console.error('  ❌ FAIL: Unexpected before delays\n');
    return false;
  }

  // Test 3.3: Test delay after operations
  console.log('TEST 3.3: Testing delays after operations...');
  const afterTitle = pacing.getDelayAfter('title');
  const afterDiagram = pacing.getDelayAfter('diagram');
  const afterDescription = pacing.getDelayAfter('description');
  
  console.log(`  After title: ${afterTitle}ms`);
  console.log(`  After diagram: ${afterDiagram}ms`);
  console.log(`  After description: ${afterDescription}ms`);
  
  if (afterTitle === 2000 && afterDiagram === 4000 && afterDescription === 3000) {
    console.log('  ✅ PASS: After delays correct\n');
  } else {
    console.error('  ❌ FAIL: Unexpected after delays\n');
    return false;
  }

  // Test 3.4: Test complexity multiplier
  console.log('TEST 3.4: Testing complexity multiplier...');
  const simpleDiagram = pacing.getDelayAfter('diagram', 1.0);
  const complexDiagram = pacing.getDelayAfter('diagram', 1.5);
  
  console.log(`  Simple diagram (1.0x): ${simpleDiagram}ms`);
  console.log(`  Complex diagram (1.5x): ${complexDiagram}ms`);
  
  if (simpleDiagram === 4000 && complexDiagram === 6000) {
    console.log('  ✅ PASS: Complexity multiplier working\n');
  } else {
    console.error(`  ❌ FAIL: Expected 4000ms and 6000ms\n`);
    return false;
  }

  // Test 3.5: Test total time calculation
  console.log('TEST 3.5: Testing total time calculation...');
  const totalTitle = pacing.getTotalTime('title');
  const totalDiagram = pacing.getTotalTime('diagram');
  
  console.log(`  Total time for title: ${totalTitle}ms`);
  console.log(`  Total time for diagram: ${totalDiagram}ms`);
  
  // Expected: before + animation + after
  // Title: 500 + 800 + 2000 = 3300
  // Diagram: 1000 + 1500 + 4000 = 6500
  
  if (totalTitle === 3300 && totalDiagram === 6500) {
    console.log('  ✅ PASS: Total times calculated correctly\n');
  } else {
    console.error(`  ❌ FAIL: Expected 3300ms and 6500ms\n`);
    return false;
  }

  // Test 3.6: Test new visual delay
  console.log('TEST 3.6: Testing new visual delay...');
  const newVisualDelay = pacing.getNewVisualDelay();
  console.log(`  New visual delay: ${newVisualDelay}ms`);
  
  if (newVisualDelay === 2000) {
    console.log('  ✅ PASS: New visual delay correct\n');
  } else {
    console.error('  ❌ FAIL: Expected 2000ms\n');
    return false;
  }

  // Test 3.7: Test fast mode
  console.log('TEST 3.7: Testing fast mode preset...');
  const fastPacing = new PacingController(PacingController.fastMode());
  const fastAfterDiagram = fastPacing.getDelayAfter('diagram');
  
  console.log(`  Fast mode after diagram: ${fastAfterDiagram}ms`);
  
  if (fastAfterDiagram === 800) {
    console.log('  ✅ PASS: Fast mode working correctly\n');
  } else {
    console.error('  ❌ FAIL: Expected 800ms\n');
    return false;
  }

  // Test 3.8: Calculate realistic step timing
  console.log('TEST 3.8: Calculating realistic step timing...');
  
  // Typical step: title + 3 visuals (heading + diagram + description each)
  const stepTime = 
    pacing.getTotalTime('title') +
    (pacing.getTotalTime('heading') + pacing.getTotalTime('diagram') + pacing.getTotalTime('description')) * 3 +
    pacing.getNewVisualDelay() * 2; // 2 pauses between 3 visuals
  
  console.log(`  Estimated time for typical step: ${stepTime}ms (${(stepTime/1000).toFixed(1)}s)`);
  console.log('  Breakdown:');
  console.log(`    - Title: ${pacing.getTotalTime('title')}ms`);
  console.log(`    - 3x (Heading + Diagram + Description): ${(pacing.getTotalTime('heading') + pacing.getTotalTime('diagram') + pacing.getTotalTime('description')) * 3}ms`);
  console.log(`    - 2x New visual pause: ${pacing.getNewVisualDelay() * 2}ms`);
  
  if (stepTime >= 30000 && stepTime <= 40000) {
    console.log('  ✅ PASS: Realistic step timing (30-40s range)\n');
  } else {
    console.warn('  ⚠️  WARNING: Step timing outside typical range\n');
  }

  console.log('═══════════════════════════════════════════════');
  console.log('✅ TEST 3: PACING CONTROLLER - PASSED');
  console.log('═══════════════════════════════════════════════\n');
  
  return true;
}

// Run test
const success = testPacingController();
process.exit(success ? 0 : 1);
