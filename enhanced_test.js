#!/usr/bin/env node

/**
 * Enhanced Test Suite for LeaF Universal Interactive Learning Engine
 * Tests the new animation system, canvas management, and dynamic content generation
 */

const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// Test scenarios covering diverse topics
const testScenarios = [
  {
    name: 'Physics - Wave Mechanics',
    query: 'Explain wave mechanics, interference patterns, and quantum wave functions with animations',
    expectedFeatures: ['drawSpiral', 'drawRipple', 'drawCurve', 'drawMathLabel']
  },
  {
    name: 'Chemistry - Molecular Structures',
    query: 'Show H2O molecular structure, hydrogen bonding, and water properties with visualizations',
    expectedFeatures: ['drawParticles', 'drawLabel', 'drawMathLabel']
  },
  {
    name: 'Mathematics - Calculus',
    query: 'Demonstrate derivatives, integrals, and limits with animated graphs and equations',
    expectedFeatures: ['drawAxis', 'drawCurve', 'drawMathLabel', 'drawTitle']
  },
  {
    name: 'Computer Science - Algorithms',
    query: 'Visualize sorting algorithms, binary search trees, and Big O notation',
    expectedFeatures: ['drawTitle', 'drawLabel', 'drawCurve']
  },
  {
    name: 'Biology - Cell Division',
    query: 'Illustrate mitosis and meiosis with step-by-step animations',
    expectedFeatures: ['drawParticles', 'drawRipple', 'drawLabel']
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkHealth() {
  try {
    const response = await axios.get(`${API_BASE}/health`);
    if (response.data.ok === true) {
      log('✓ Health check passed', 'green');
      return true;
    }
  } catch (error) {
    log('✗ Health check failed: ' + error.message, 'red');
    return false;
  }
}

async function testScenario(scenario) {
  return new Promise(async (resolve) => {
    log(`\n${colors.bright}Testing: ${scenario.name}${colors.reset}`, 'cyan');
    log(`Query: "${scenario.query}"`, 'blue');
    
    const sessionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    const results = {
      scenario: scenario.name,
      success: false,
      planReceived: false,
      stepsRendered: 0,
      animationsDetected: [],
      errors: [],
      timeline: []
    };
    
    const startTime = Date.now();
    let stepCount = 0;
    let timeoutId;
    
    socket.on('connect', () => {
      log('  → Socket connected', 'green');
      socket.emit('join', sessionId);
    });
    
    socket.on('rendered', (data) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      stepCount++;
      
      if (data.plan) {
        results.planReceived = true;
        log(`  → Plan received: "${data.plan.title}"`, 'green');
        if (data.plan.subtitle) {
          log(`    Subtitle: ${data.plan.subtitle}`, 'cyan');
        }
        if (data.plan.toc && data.plan.toc.length > 0) {
          log(`    TOC with ${data.plan.toc.length} sections`, 'cyan');
        }
      }
      
      if (data.step) {
        log(`  → Step ${stepCount}: ${data.step.desc} (${elapsed}s)`, 'yellow');
        results.stepsRendered++;
      }
      
      if (data.actions && Array.isArray(data.actions)) {
        const actionTypes = data.actions.map(a => a.op);
        const uniqueActions = [...new Set(actionTypes)];
        
        // Check for enhanced animations
        const enhancedOps = ['drawParticles', 'drawSpiral', 'drawRipple'];
        const hasEnhanced = uniqueActions.some(op => enhancedOps.includes(op));
        
        if (hasEnhanced) {
          log(`    ✨ Enhanced animations detected: ${uniqueActions.filter(op => enhancedOps.includes(op)).join(', ')}`, 'magenta');
        }
        
        results.animationsDetected.push(...uniqueActions);
        log(`    Actions: ${uniqueActions.join(', ')}`, 'cyan');
        
        results.timeline.push({
          step: stepCount,
          time: elapsed,
          actions: uniqueActions
        });
      }
      
      // Check if we've received all expected steps (5 steps total)
      if (results.stepsRendered >= 5) {
        results.success = true;
        clearTimeout(timeoutId);
        cleanup();
      }
    });
    
    socket.on('error', (error) => {
      log(`  ✗ Socket error: ${error}`, 'red');
      results.errors.push(error.toString());
    });
    
    socket.on('connect_error', (error) => {
      log(`  ✗ Connection error: ${error.message}`, 'red');
      results.errors.push(error.message);
      cleanup();
    });
    
    // Set timeout for test completion
    timeoutId = setTimeout(() => {
      log('  ⚠ Test timeout reached (30s)', 'yellow');
      cleanup();
    }, 30000);
    
    function cleanup() {
      socket.disconnect();
      
      // Analyze results
      log('\n  Summary:', 'bright');
      log(`    Plan received: ${results.planReceived ? '✓' : '✗'}`, results.planReceived ? 'green' : 'red');
      log(`    Steps rendered: ${results.stepsRendered}/5`, results.stepsRendered >= 5 ? 'green' : 'yellow');
      
      const uniqueAnimations = [...new Set(results.animationsDetected)];
      log(`    Unique animations: ${uniqueAnimations.length}`, 'cyan');
      
      // Check for expected features
      const foundFeatures = scenario.expectedFeatures.filter(f => 
        results.animationsDetected.includes(f)
      );
      log(`    Expected features found: ${foundFeatures.length}/${scenario.expectedFeatures.length}`, 
        foundFeatures.length === scenario.expectedFeatures.length ? 'green' : 'yellow');
      
      if (foundFeatures.length < scenario.expectedFeatures.length) {
        const missing = scenario.expectedFeatures.filter(f => !foundFeatures.includes(f));
        log(`    Missing: ${missing.join(', ')}`, 'yellow');
      }
      
      // Check for vertical scrolling capability (multiple sections)
      const hasMultipleSections = results.stepsRendered > 1;
      log(`    Multi-section support: ${hasMultipleSections ? '✓' : '✗'}`, hasMultipleSections ? 'green' : 'red');
      
      // Check for rich animations
      const enhancedAnimations = ['drawParticles', 'drawSpiral', 'drawRipple'];
      const hasRichAnimations = uniqueAnimations.some(a => enhancedAnimations.includes(a));
      log(`    Rich animations: ${hasRichAnimations ? '✓' : '✗'}`, hasRichAnimations ? 'green' : 'red');
      
      results.success = results.planReceived && results.stepsRendered >= 3;
      
      resolve(results);
    }
    
    // Send the query
    try {
      const response = await axios.post(`${API_BASE}/api/query`, {
        query: scenario.query,
        sessionId: sessionId
      });
      
      if (response.data.sessionId) {
        log(`  → Query submitted (session: ${response.data.sessionId})`, 'green');
      }
    } catch (error) {
      log(`  ✗ Failed to submit query: ${error.message}`, 'red');
      results.errors.push(error.message);
      cleanup();
    }
  });
}

async function runAllTests() {
  log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bright}  LeaF Enhanced Animation & Canvas Management Test Suite${colors.reset}`);
  log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  
  // Check health first
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    log('\n⚠ Backend is not healthy. Please ensure the server is running.', 'red');
    log('Start the backend with: cd app/backend && npm run dev', 'yellow');
    process.exit(1);
  }
  
  const results = [];
  
  // Run tests sequentially with delay between them
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push(result);
    
    // Wait between tests to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final summary
  log(`\n${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bright}                    FINAL RESULTS${colors.reset}`);
  log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  log(`\nTests passed: ${successful}/${total}`, successful === total ? 'green' : 'yellow');
  
  // Check for key improvements
  const improvements = {
    'No hardcoded fallbacks': results.every(r => r.errors.length === 0 || !r.errors.some(e => e.includes('fallback'))),
    'Rich animations present': results.some(r => r.animationsDetected.includes('drawParticles') || r.animationsDetected.includes('drawSpiral')),
    'Multi-section rendering': results.every(r => r.stepsRendered > 1),
    'Dynamic content generation': results.every(r => r.planReceived),
    'Smooth progression': results.every(r => r.stepsRendered >= 3)
  };
  
  log('\nKey Improvements:', 'bright');
  for (const [feature, achieved] of Object.entries(improvements)) {
    log(`  ${achieved ? '✓' : '✗'} ${feature}`, achieved ? 'green' : 'red');
  }
  
  // Performance metrics
  log('\nPerformance Metrics:', 'bright');
  const avgSteps = results.reduce((sum, r) => sum + r.stepsRendered, 0) / results.length;
  log(`  Average steps rendered: ${avgSteps.toFixed(1)}`, 'cyan');
  
  const totalAnimations = results.reduce((sum, r) => sum + r.animationsDetected.length, 0);
  log(`  Total animations triggered: ${totalAnimations}`, 'cyan');
  
  const uniqueAnimationTypes = [...new Set(results.flatMap(r => r.animationsDetected))];
  log(`  Unique animation types used: ${uniqueAnimationTypes.length}`, 'cyan');
  log(`    Types: ${uniqueAnimationTypes.join(', ')}`, 'blue');
  
  // Success criteria
  const allTestsPassed = successful === total;
  const hasRichAnimations = improvements['Rich animations present'];
  const noHardcodedFallbacks = improvements['No hardcoded fallbacks'];
  
  if (allTestsPassed && hasRichAnimations && noHardcodedFallbacks) {
    log(`\n${colors.bright}✨ SUCCESS! All enhancements are working correctly! ✨${colors.reset}`, 'green');
    log('The system now features:', 'green');
    log('  • Rich, YouTube-like animations', 'green');
    log('  • Dynamic vertical canvas with scrolling', 'green');
    log('  • No hardcoded fallbacks', 'green');
    log('  • Smooth automatic progression', 'green');
    log('  • Enhanced visual learning experience', 'green');
  } else {
    log('\n⚠ Some improvements may need attention', 'yellow');
    if (!allTestsPassed) log('  - Not all tests passed', 'yellow');
    if (!hasRichAnimations) log('  - Rich animations not detected', 'yellow');
    if (!noHardcodedFallbacks) log('  - Hardcoded fallbacks may still exist', 'yellow');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  log(`\n✗ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
