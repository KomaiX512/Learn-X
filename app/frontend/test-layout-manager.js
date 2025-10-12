/**
 * TEST 2: VerticalLayoutManager
 * Verify layout manager creates zones and transforms coordinates correctly
 */

// Inline the VerticalLayoutManager class for testing
class VerticalLayoutManager {
  constructor(canvasWidth, canvasHeight, config = {}) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.zones = new Map();
    this.currentY = 40; // Start with top padding
    
    this.config = {
      canvasWidth,
      canvasHeight,
      minZoneHeight: config.minZoneHeight || 150,
      maxZoneHeight: config.maxZoneHeight || 600,
      zonePadding: config.zonePadding || 40,
      titleHeight: config.titleHeight || 120,
      headingHeight: config.headingHeight || 80,
      diagramHeight: config.diagramHeight || 400,
      descriptionHeight: config.descriptionHeight || 100
    };
    
    this.HIERARCHY = {
      title: { fontSize: 36, spacing: 60, color: '#ffffff', fontWeight: 'bold' },
      heading1: { fontSize: 28, spacing: 40, color: '#e0e0e0', fontWeight: 'bold' },
      heading2: { fontSize: 22, spacing: 30, color: '#d0d0d0', fontWeight: '600' },
      heading3: { fontSize: 18, spacing: 24, color: '#c0c0c0', fontWeight: '600' },
      body: { fontSize: 16, spacing: 20, color: '#b0b0b0', fontWeight: 'normal' },
      annotation: { fontSize: 14, spacing: 16, color: '#a0a0a0', fontWeight: 'normal' },
      label: { fontSize: 16, spacing: 18, color: '#ffffff', fontWeight: 'normal' }
    };
  }
  
  createZone(id, type, customHeight) {
    if (this.zones.has(id)) {
      return this.zones.get(id);
    }
    
    let height;
    if (customHeight) {
      height = Math.min(customHeight, this.config.maxZoneHeight);
    } else {
      switch (type) {
        case 'title':
          height = this.config.titleHeight;
          break;
        case 'heading':
          height = this.config.headingHeight;
          break;
        case 'diagram':
          height = this.config.diagramHeight;
          break;
        case 'description':
          height = this.config.descriptionHeight;
          break;
        case 'annotation':
          height = 60;
          break;
        default:
          height = this.config.minZoneHeight;
      }
    }
    
    const zone = {
      id,
      type,
      startY: this.currentY,
      height,
      usedHeight: 0,
      padding: this.config.zonePadding,
      elements: new Set()
    };
    
    this.zones.set(id, zone);
    this.currentY += height + this.config.zonePadding;
    
    return zone;
  }
  
  transformCoordinates(zoneId, normalizedX, normalizedY) {
    const zone = this.zones.get(zoneId);
    
    if (!zone) {
      return {
        x: normalizedX * this.canvasWidth,
        y: normalizedY * this.canvasHeight
      };
    }
    
    return {
      x: normalizedX * this.canvasWidth,
      y: zone.startY + (normalizedY * zone.height)
    };
  }
  
  getHierarchyStyle(level) {
    return this.HIERARCHY[level];
  }
  
  getTotalHeight() {
    return this.currentY + 40; // Add bottom padding
  }
  
  reset() {
    this.zones.clear();
    this.currentY = 40;
  }
  
  getZones() {
    return Array.from(this.zones.values());
  }
}

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
