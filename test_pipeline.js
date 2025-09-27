const http = require('http');

const API_BASE = 'http://localhost:3001';
const TEST_QUERY = 'What is a derivative?';

console.log('🔬 LEAF PIPELINE TEST - COMPLETE DEBUGGING');
console.log('==========================================\n');

let socket = null;
let sessionId = null;
let testMetrics = {
    startTime: Date.now(),
    planTime: 0,
    generationTimes: [],
    stepsReceived: 0,
    stepsExpected: 5,
    errors: [],
    warnings: [],
    cacheHits: 0
};

async function runTest() {
    console.log('📋 TEST CONFIGURATION:');
    console.log(`  Query: "${TEST_QUERY}"`);
    console.log(`  Backend: ${API_BASE}`);
    console.log(`  Expected Steps: ${testMetrics.stepsExpected}`);
    console.log('\n');
    
    // Step 1: Connect WebSocket
    console.log('🔌 STEP 1: WebSocket Connection');
    console.log('--------------------------------');
    await connectSocket();
    
    // Step 2: Send Query
    console.log('\n📤 STEP 2: Sending Query');
    console.log('------------------------');
    await sendQuery();
    
    // Wait for completion
    await waitForCompletion();
}

function connectSocket() {
    return new Promise((resolve, reject) => {
        console.log('  Connecting to WebSocket...');
        
        socket = io(API_BASE, {
            transports: ['websocket', 'polling']
        });
        
        socket.on('connect', () => {
            console.log(`  ✅ Connected with ID: ${socket.id}`);
            setupSocketListeners();
            resolve();
        });
        
        socket.on('connect_error', (error) => {
            console.error(`  ❌ Connection failed: ${error.message}`);
            reject(error);
        });
    });
}

function setupSocketListeners() {
    socket.on('joined', (data) => {
        console.log(`  ✅ Joined session room: ${data.sessionId}`);
    });
    
    socket.on('status', (data) => {
        console.log(`\n📊 STATUS: ${data.type}`);
        console.log(`  Message: ${data.message}`);
        
        if (data.type === 'plan_ready') {
            testMetrics.planTime = Date.now() - testMetrics.startTime;
            console.log(`  ✅ Plan generated in ${testMetrics.planTime}ms`);
            console.log(`  Title: ${data.plan.title}`);
            console.log(`  Subtitle: ${data.plan.subtitle}`);
            console.log('  TOC:');
            data.plan.toc.forEach(item => {
                console.log(`    ${item.minute}. ${item.title}: ${item.summary}`);
            });
        }
        
        if (data.type === 'generation_complete') {
            console.log(`  ✅ Generation complete!`);
            console.log(`  Successful: ${data.successful}/${data.successful + data.failed}`);
            console.log(`  Total Time: ${data.totalTime}ms`);
            
            if (data.performance) {
                console.log('  Performance Metrics:');
                console.log(`    Cache Hit Rate: ${data.performance.cacheHitRate}%`);
                console.log(`    Avg Plan Time: ${data.performance.avgPlanTime}ms`);
                console.log(`    Avg Step Time: ${data.performance.avgStepTime}ms`);
                testMetrics.cacheHits = data.performance.cacheHitRate;
            }
        }
    });
    
    socket.on('progress', (data) => {
        if (data.status === 'generating') {
            console.log(`\n⚡ Generating Step ${data.stepId}: ${data.message}`);
        } else if (data.status === 'ready') {
            console.log(`  ✅ Step ${data.stepId} ready!`);
            console.log(`    Actions: ${data.actionsCount}`);
            console.log(`    Generation Time: ${data.generationTime}ms`);
            testMetrics.generationTimes.push(data.generationTime);
        } else if (data.status === 'error') {
            console.error(`  ❌ Step ${data.stepId} failed: ${data.error}`);
            testMetrics.errors.push(`Step ${data.stepId}: ${data.error}`);
        }
    });
    
    socket.on('rendered', (data) => {
        testMetrics.stepsReceived++;
        console.log(`\n🎨 RENDERED Step ${data.step.id}/${testMetrics.stepsExpected}`);
        console.log(`  Tag: ${data.step.tag}`);
        console.log(`  Description: ${data.step.desc}`);
        console.log(`  Actions Count: ${data.actions?.length || 0}`);
        
        // Validate the data
        validateStepData(data);
        
        // Show first 3 actions as sample
        if (data.actions && data.actions.length > 0) {
            console.log('  Sample Actions:');
            data.actions.slice(0, 3).forEach((action, i) => {
                console.log(`    ${i+1}. ${action.op}${action.text ? ': "' + action.text + '"' : ''}`);
            });
        }
    });
    
    socket.on('error', (error) => {
        console.error(`\n❌ Socket Error: ${error}`);
        testMetrics.errors.push(`Socket: ${error}`);
    });
}

async function sendQuery() {
    try {
        console.log(`  Sending query: "${TEST_QUERY}"`);
        
        const response = await fetch(`${API_BASE}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: TEST_QUERY })
        });
        
        const data = await response.json();
        sessionId = data.sessionId;
        
        console.log(`  ✅ Query sent successfully`);
        console.log(`  Session ID: ${sessionId}`);
        
        // Join the socket room
        socket.emit('join', { sessionId });
        
    } catch (error) {
        console.error(`  ❌ Failed to send query: ${error.message}`);
        testMetrics.errors.push(`Query: ${error.message}`);
        throw error;
    }
}

function validateStepData(data) {
    let isValid = true;
    
    // Check for required fields
    if (!data.step) {
        console.error('    ⚠️ Missing step object');
        testMetrics.warnings.push('Missing step object');
        isValid = false;
    }
    
    if (!data.actions || !Array.isArray(data.actions)) {
        console.error('    ⚠️ Missing or invalid actions array');
        testMetrics.warnings.push('Missing actions array');
        isValid = false;
    }
    
    if (!data.plan) {
        console.error('    ⚠️ Missing plan object');
        testMetrics.warnings.push('Missing plan object');
        isValid = false;
    }
    
    // Check actions for issues
    if (data.actions) {
        let hasIssues = false;
        
        data.actions.forEach((action, i) => {
            if (!action.op) {
                console.error(`    ⚠️ Action ${i}: Missing op field`);
                hasIssues = true;
            }
            
            const actionStr = JSON.stringify(action);
            if (actionStr.includes('Math.')) {
                console.error(`    ⚠️ Action ${i}: Contains Math.* function`);
                testMetrics.warnings.push(`Action contains Math.*`);
                hasIssues = true;
            }
            
            if (actionStr.match(/\d+\s*[+\-*/]\s*\d+/)) {
                console.error(`    ⚠️ Action ${i}: Contains arithmetic expression`);
                testMetrics.warnings.push(`Action contains arithmetic`);
                hasIssues = true;
            }
        });
        
        if (!hasIssues && isValid) {
            console.log('    ✅ Data validation passed');
        }
    }
}

function waitForCompletion() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (testMetrics.stepsReceived >= testMetrics.stepsExpected || 
                Date.now() - testMetrics.startTime > 120000) { // 2 minute timeout
                clearInterval(checkInterval);
                generateReport();
                resolve();
            }
        }, 1000);
    });
}

function generateReport() {
    const totalTime = Date.now() - testMetrics.startTime;
    const avgGenTime = testMetrics.generationTimes.length > 0 
        ? testMetrics.generationTimes.reduce((a, b) => a + b, 0) / testMetrics.generationTimes.length 
        : 0;
    
    console.log('\n\n');
    console.log('═══════════════════════════════════════');
    console.log('📊 FINAL TEST REPORT');
    console.log('═══════════════════════════════════════');
    
    console.log('\n📈 SUCCESS METRICS:');
    console.log(`  Steps Completed: ${testMetrics.stepsReceived}/${testMetrics.stepsExpected}`);
    console.log(`  Success Rate: ${(testMetrics.stepsReceived/testMetrics.stepsExpected*100).toFixed(1)}%`);
    console.log(`  Cache Hit Rate: ${testMetrics.cacheHits}%`);
    
    console.log('\n⏱️ PERFORMANCE:');
    console.log(`  Total Time: ${(totalTime/1000).toFixed(1)}s`);
    console.log(`  Plan Generation: ${testMetrics.planTime}ms`);
    console.log(`  Avg Step Generation: ${avgGenTime.toFixed(0)}ms`);
    
    if (testMetrics.generationTimes.length > 0) {
        console.log(`  Min Step Time: ${Math.min(...testMetrics.generationTimes)}ms`);
        console.log(`  Max Step Time: ${Math.max(...testMetrics.generationTimes)}ms`);
    }
    
    console.log('\n⚠️ ISSUES FOUND:');
    if (testMetrics.errors.length === 0 && testMetrics.warnings.length === 0) {
        console.log('  ✅ No issues detected!');
    } else {
        if (testMetrics.errors.length > 0) {
            console.log('  Errors:');
            testMetrics.errors.forEach(err => console.log(`    - ${err}`));
        }
        if (testMetrics.warnings.length > 0) {
            console.log('  Warnings:');
            testMetrics.warnings.forEach(warn => console.log(`    - ${warn}`));
        }
    }
    
    console.log('\n🎯 VERDICT:');
    if (testMetrics.stepsReceived === testMetrics.stepsExpected && 
        testMetrics.errors.length === 0) {
        console.log('  ✅ FULL PIPELINE SUCCESS!');
    } else if (testMetrics.stepsReceived > 0) {
        console.log('  ⚠️ PARTIAL SUCCESS - Some issues detected');
    } else {
        console.log('  ❌ PIPELINE FAILURE - Critical issues found');
    }
    
    console.log('\n═══════════════════════════════════════\n');
    
    // Cleanup
    if (socket) {
        socket.disconnect();
    }
    process.exit(0);
}

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('\n❌ UNCAUGHT ERROR:', error.message);
    testMetrics.errors.push(`Uncaught: ${error.message}`);
    generateReport();
});

// Run the test
runTest().catch(error => {
    console.error('\n❌ TEST FAILED:', error.message);
    generateReport();
});
