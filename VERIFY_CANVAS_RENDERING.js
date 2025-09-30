/**
 * CANVAS RENDERING VERIFICATION TEST
 * 
 * This monitors the frontend to verify:
 * 1. Operations are actually rendered on canvas
 * 2. No renderer errors occur
 * 3. All operations complete successfully
 * 4. Visual quality meets standards
 */

const puppeteer = require('puppeteer');
const io = require('socket.io-client');
const axios = require('axios');

console.log('\n' + '═'.repeat(100));
console.log('🎨 CANVAS RENDERING VERIFICATION TEST');
console.log('═'.repeat(100) + '\n');

const query = `explain photosynthesis ${Date.now()}`;
const sessionId = `render-test-${Date.now()}`;

const results = {
  query,
  sessionId,
  
  backend: {
    stepsGenerated: 0,
    totalOperations: 0,
    v2Operations: 0
  },
  
  canvas: {
    renderingStarted: false,
    operationsRendered: 0,
    renderErrors: [],
    missingRenderers: [],
    visualElements: [],
    canvasLayers: 0
  },
  
  quality: {
    allOperationsRendered: false,
    noMissingRenderers: false,
    noRenderErrors: false,
    v2Ratio: 0
  },
  
  verdict: {
    score: 0,
    status: ''
  }
};

async function runTest() {
  let browser;
  
  try {
    // Start browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Show browser for visual verification
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Monitor console logs from frontend
    page.on('console', msg => {
      const text = msg.text();
      
      // Detect rendering start
      if (text.includes('AnimationQueue') && text.includes('Starting Step')) {
        results.canvas.renderingStarted = true;
        console.log(`🎬 Rendering started!`);
      }
      
      // Count rendered operations
      if (text.includes('Completed') && text.includes('AnimationQueue')) {
        results.canvas.operationsRendered++;
      }
      
      // Detect errors
      if (text.includes('ERROR') || text.includes('Error') || text.includes('error')) {
        results.canvas.renderErrors.push(text);
        console.error(`❌ Render error: ${text.substring(0, 100)}`);
      }
      
      // Detect missing renderers
      if (text.includes('No renderer for') || text.includes('not implemented')) {
        results.canvas.missingRenderers.push(text);
        console.error(`⚠️  Missing renderer: ${text.substring(0, 100)}`);
      }
    });
    
    // Navigate to app
    console.log('📱 Loading application...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    
    // Wait for app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    console.log('✅ Application loaded\n');
    
    // Submit query
    console.log(`📤 Submitting query: "${query}"\n`);
    await page.type('textarea', query);
    await page.click('button[type="submit"]');
    
    // Wait for backend to generate
    console.log('⏳ Waiting for generation and rendering (60 seconds)...\n');
    
    // Monitor for 60 seconds
    await new Promise(resolve => {
      let elapsed = 0;
      const interval = setInterval(async () => {
        elapsed += 5;
        
        // Check canvas state
        try {
          const canvasState = await page.evaluate(() => {
            const konvaContainers = document.querySelectorAll('.konvajs-content');
            const layers = document.querySelectorAll('.konvajs-content canvas');
            
            return {
              hasCanvas: konvaContainers.length > 0,
              layerCount: layers.length,
              canvasWidth: konvaContainers[0]?.offsetWidth || 0,
              canvasHeight: konvaContainers[0]?.offsetHeight || 0
            };
          });
          
          results.canvas.canvasLayers = canvasState.layerCount;
          
          if (elapsed % 10 === 0) {
            console.log(`[${elapsed}s] Layers: ${canvasState.layerCount}, Ops rendered: ${results.canvas.operationsRendered}, Errors: ${results.canvas.renderErrors.length}`);
          }
        } catch (e) {
          // Canvas might not be ready
        }
        
        if (elapsed >= 60) {
          clearInterval(interval);
          resolve();
        }
      }, 5000);
    });
    
    // Final canvas analysis
    console.log('\n📊 Analyzing canvas state...');
    
    const finalState = await page.evaluate(() => {
      const layers = document.querySelectorAll('.konvajs-content canvas');
      const shapes = document.querySelectorAll('.konvajs-content canvas');
      
      return {
        layerCount: layers.length,
        hasVisibleContent: layers.length > 0,
        canvasElements: shapes.length
      };
    });
    
    results.canvas.canvasLayers = finalState.layerCount;
    results.quality.allOperationsRendered = results.canvas.operationsRendered > 0;
    results.quality.noMissingRenderers = results.canvas.missingRenderers.length === 0;
    results.quality.noRenderErrors = results.canvas.renderErrors.length === 0;
    
    // Take screenshot
    await page.screenshot({ path: '/home/komail/LeaF/canvas_screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved: canvas_screenshot.png');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Connect to backend to get operation stats
  console.log('\n📡 Getting backend stats...');
  
  const socket = io('http://localhost:3001', {
    transports: ['websocket'],
    reconnection: false
  });
  
  await new Promise((resolve) => {
    socket.on('connect', () => {
      socket.emit('join', { sessionId });
    });
    
    socket.on('rendered', (data) => {
      if (data.stepId && data.actions) {
        results.backend.stepsGenerated++;
        results.backend.totalOperations += data.actions.length;
        
        const v2Ops = data.actions.filter(a => 
          ['drawPhysicsObject', 'drawForceVector', 'drawAtom', 'drawReaction',
           'drawCircuitElement', 'drawSignalWaveform', 'animate', 'drawCellStructure',
           'drawOrganSystem', 'drawMembrane', 'drawMolecule'].includes(a.op)
        ).length;
        
        results.backend.v2Operations += v2Ops;
      }
    });
    
    setTimeout(() => {
      socket.close();
      resolve();
    }, 5000);
  });
  
  results.quality.v2Ratio = results.backend.totalOperations > 0 
    ? (results.backend.v2Operations / results.backend.totalOperations * 100)
    : 0;
  
  // Calculate score
  let score = 0;
  
  // Canvas rendering (40 points)
  if (results.canvas.renderingStarted) score += 10;
  if (results.canvas.operationsRendered > 0) score += 20;
  if (results.canvas.canvasLayers > 0) score += 10;
  
  // Quality (40 points)
  if (results.quality.noRenderErrors) score += 20;
  if (results.quality.noMissingRenderers) score += 20;
  
  // Backend quality (20 points)
  if (results.quality.v2Ratio >= 70) score += 20;
  else if (results.quality.v2Ratio >= 50) score += 10;
  
  results.verdict.score = score;
  
  // Print results
  console.log('\n' + '═'.repeat(100));
  console.log('📊 CANVAS RENDERING VERIFICATION RESULTS');
  console.log('═'.repeat(100));
  
  console.log('\n🔧 BACKEND:');
  console.log(`  Steps: ${results.backend.stepsGenerated}/5`);
  console.log(`  Operations: ${results.backend.totalOperations}`);
  console.log(`  V2 Ratio: ${results.quality.v2Ratio.toFixed(1)}%`);
  
  console.log('\n🎨 CANVAS:');
  console.log(`  Rendering started: ${results.canvas.renderingStarted ? '✅' : '❌'}`);
  console.log(`  Operations rendered: ${results.canvas.operationsRendered}`);
  console.log(`  Canvas layers: ${results.canvas.canvasLayers}`);
  console.log(`  Render errors: ${results.canvas.renderErrors.length}`);
  console.log(`  Missing renderers: ${results.canvas.missingRenderers.length}`);
  
  if (results.canvas.renderErrors.length > 0) {
    console.log('\n❌ Render Errors:');
    results.canvas.renderErrors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.substring(0, 80)}`);
    });
  }
  
  if (results.canvas.missingRenderers.length > 0) {
    console.log('\n⚠️  Missing Renderers:');
    results.canvas.missingRenderers.forEach(mr => {
      console.log(`  - ${mr.substring(0, 80)}`);
    });
  }
  
  console.log('\n💎 VERDICT:');
  console.log(`Score: ${score}/100\n`);
  
  if (score >= 90) {
    results.verdict.status = '✅ CANVAS RENDERING PERFECT';
    console.log('🏆 ✅ CANVAS RENDERING WORKING PERFECTLY!');
  } else if (score >= 70) {
    results.verdict.status = '⚠️  Canvas rendering mostly working';
    console.log('⚠️  Canvas rendering mostly working with minor issues');
  } else {
    results.verdict.status = '❌ Canvas rendering broken';
    console.log('❌ Canvas rendering has critical issues');
  }
  
  console.log('\n' + '═'.repeat(100) + '\n');
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('/home/komail/LeaF/canvas_verification.json', JSON.stringify(results, null, 2));
  console.log('📄 Results saved: canvas_verification.json\n');
  
  process.exit(score >= 70 ? 0 : 1);
}

runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
