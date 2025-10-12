/**
 * TEST 2: VerticalLayoutManager
 * Verify layout manager creates zones and transforms coordinates correctly
 */

import { VerticalLayoutManager } from './src/layout/VerticalLayoutManager';

function testLayoutManager() {
  console.log('═══════════════════════════════════════════════');
  console.log('TEST 2: VerticalLayoutManager');
  console.log('═══════════════════════════════════════════════\n');

  const canvasWidth = 800;
  const canvasHeight = 500;

  // Test 2.1: Create layout manager
  console.log('TEST 2.1: Creating layout manager...');
  const layoutManager = new VerticalLayoutManager(canvasWidth, canvasHeight);
  console.log(`  ✅ Created with canvas ${canvasWidth}x${canvasHeight}\n`);

  // Test 2.2: Create title zone
  console.log('TEST 2.2: Creating title zone...');
  const titleZone = layoutManager.createZone('title', 'title');
  console.log(`  Zone created: startY=${titleZone.startY}, height=${titleZone.height}`);
  
  if (titleZone.startY === 40 && titleZone.height === 120) {
    console.log('  ✅ PASS: Title zone has correct dimensions\n');
  } else {
    console.error('  ❌ FAIL: Expected startY=40, height=120\n');
    return false;
  }

  // Test 2.3: Create diagram zone
  console.log('TEST 2.3: Creating diagram zone...');
  const diagramZone = layoutManager.createZone('diagram-1', 'diagram');
  console.log(`  Zone created: startY=${diagramZone.startY}, height=${diagramZone.height}`);
  
  const expectedY = 40 + 120 + 40; // title.startY + title.height + padding
  if (diagramZone.startY === expectedY && diagramZone.height === 400) {
    console.log('  ✅ PASS: Diagram zone positioned correctly below title\n');
  } else {
    console.error(`  ❌ FAIL: Expected startY=${expectedY}, height=400\n`);
    return false;
  }

  // Test 2.4: Transform coordinates
  console.log('TEST 2.4: Testing coordinate transformation...');
  
  // Test title zone transformation
  const titleCoords = layoutManager.transformCoordinates('title', 0.5, 0.5);
  console.log(`  title (0.5, 0.5) → (${titleCoords.x}, ${titleCoords.y})`);
  
  const expectedTitleX = 0.5 * canvasWidth; // 400
  const expectedTitleY = 40 + (0.5 * 120); // 40 + 60 = 100
  
  if (titleCoords.x === expectedTitleX && titleCoords.y === expectedTitleY) {
    console.log('  ✅ PASS: Title coordinates transformed correctly');
  } else {
    console.error(`  ❌ FAIL: Expected (${expectedTitleX}, ${expectedTitleY})`);
    return false;
  }

  // Test diagram zone transformation
  const diagramCoords = layoutManager.transformCoordinates('diagram-1', 0.5, 0.5);
  console.log(`  diagram-1 (0.5, 0.5) → (${diagramCoords.x}, ${diagramCoords.y})`);
  
  const expectedDiagramX = 0.5 * canvasWidth; // 400
  const expectedDiagramY = 200 + (0.5 * 400); // 200 + 200 = 400
  
  if (diagramCoords.x === expectedDiagramX && diagramCoords.y === expectedDiagramY) {
    console.log('  ✅ PASS: Diagram coordinates transformed correctly\n');
  } else {
    console.error(`  ❌ FAIL: Expected (${expectedDiagramX}, ${expectedDiagramY})`);
    return false;
  }

  // Test 2.5: Get total height
  console.log('TEST 2.5: Testing total height calculation...');
  const totalHeight = layoutManager.getTotalHeight();
  console.log(`  Total height: ${totalHeight}px`);
  
  // Expected: 40 (top padding) + 120 (title) + 40 (padding) + 400 (diagram) + 40 (padding) + 40 (bottom padding)
  const expectedTotal = 40 + 120 + 40 + 400 + 40 + 40; // 680
  
  if (totalHeight === expectedTotal) {
    console.log('  ✅ PASS: Total height calculated correctly\n');
  } else {
    console.error(`  ❌ FAIL: Expected ${expectedTotal}px\n`);
    return false;
  }

  // Test 2.6: Visual hierarchy
  console.log('TEST 2.6: Testing visual hierarchy...');
  const titleStyle = layoutManager.getHierarchyStyle('title');
  const bodyStyle = layoutManager.getHierarchyStyle('body');
  const annotationStyle = layoutManager.getHierarchyStyle('annotation');
  
  console.log(`  Title: ${titleStyle.fontSize}px, ${titleStyle.fontWeight}`);
  console.log(`  Body: ${bodyStyle.fontSize}px, ${bodyStyle.fontWeight}`);
  console.log(`  Annotation: ${annotationStyle.fontSize}px, ${annotationStyle.fontWeight}`);
  
  if (titleStyle.fontSize === 36 && bodyStyle.fontSize === 16 && annotationStyle.fontSize === 14) {
    console.log('  ✅ PASS: Visual hierarchy styles correct\n');
  } else {
    console.error('  ❌ FAIL: Unexpected font sizes\n');
    return false;
  }

  // Test 2.7: Reset functionality
  console.log('TEST 2.7: Testing reset...');
  layoutManager.reset();
  const zonesAfterReset = layoutManager.getZones();
  console.log(`  Zones after reset: ${zonesAfterReset.length}`);
  
  if (zonesAfterReset.length === 0) {
    console.log('  ✅ PASS: Reset clears all zones\n');
  } else {
    console.error('  ❌ FAIL: Zones not cleared\n');
    return false;
  }

  console.log('═══════════════════════════════════════════════');
  console.log('✅ TEST 2: LAYOUT MANAGER - PASSED');
  console.log('═══════════════════════════════════════════════\n');
  
  return true;
}

// Run test
const success = testLayoutManager();
process.exit(success ? 0 : 1);
