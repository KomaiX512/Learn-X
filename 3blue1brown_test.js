// 3Blue1Brown-style animation test
// Tests the enhanced visual learning system with profound animations

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/query';

// Test topics that showcase 3Blue1Brown-style visualizations
const testCases = [
  {
    name: "Derivatives Visualization",
    query: "Show derivatives as tangent lines moving along a curve - visualize f(x) = x^2",
    expectedVisuals: ["curve", "tangent lines", "slope changes"]
  },
  {
    name: "Vector Addition",
    query: "Demonstrate vector addition and subtraction with animated arrows",
    expectedVisuals: ["vectors", "parallelogram rule", "resultant"]
  },
  {
    name: "Complex Numbers",
    query: "Visualize complex numbers on the complex plane with rotations",
    expectedVisuals: ["complex plane", "unit circle", "euler's formula"]
  },
  {
    name: "Fourier Series",
    query: "Show how sine waves combine to form complex waveforms",
    expectedVisuals: ["multiple sine waves", "superposition", "frequency components"]
  },
  {
    name: "Linear Transformations",
    query: "Animate matrix transformations - rotation, scaling, shearing",
    expectedVisuals: ["grid deformation", "basis vectors", "determinant"]
  }
];

async function testVisualization(testCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`Query: ${testCase.query}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const response = await axios.post(API_URL, {
      query: testCase.query,
      sessionId: `3b1b-test-${Date.now()}`
    });
    
    console.log('✅ Query accepted');
    console.log(`Session ID: ${response.data.sessionId}`);
    console.log(`Status: ${response.data.status}`);
    
    // Wait for animations to process
    console.log('⏳ Waiting for visual generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`\n📊 Expected visuals: ${testCase.expectedVisuals.join(', ')}`);
    console.log('🎨 Check the browser preview for 3Blue1Brown-style animations!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

async function runAllTests() {
  console.log('🎬 3Blue1Brown-Style Visual Learning Test Suite');
  console.log('=' .repeat(60));
  console.log('Testing profound mathematical visualizations...\n');
  
  for (const testCase of testCases) {
    await testVisualization(testCase);
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ All visualization tests completed!');
  console.log('Check the browser preview to see the animations in action.');
  console.log('\nKey features to observe:');
  console.log('- Smooth curve animations with easing');
  console.log('- Vectors extending from points');
  console.log('- Color-coded mathematical elements');
  console.log('- Progressive concept building');
  console.log('- Typewriter text effects');
  console.log('- Mathematical formula rendering');
}

// Run the tests
runAllTests().catch(console.error);
