"use strict";
/**
 * UNIT TEST: Precision-Guided Two-Stage V3 Pipeline
 *
 * Tests the complete workflow:
 * 1. SubPlanner creates detailed specifications
 * 2. Visual Executor generates operations from specs
 * 3. Sequential rendering with proper delays
 * 4. No fallbacks, all true generation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_CASES = void 0;
exports.runAllTests = runAllTests;
exports.testSingleStep = testSingleStep;
const codegenV3_1 = __importDefault(require("../agents/codegenV3"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Test topics covering different domains
const TEST_CASES = [
    {
        topic: 'Cellular Respiration in Mitochondria',
        step: {
            id: 1,
            tag: 'introduction',
            desc: 'ATP Production via Electron Transport Chain',
            compiler: 'js',
            complexity: 3
        }
    },
    {
        topic: 'Quantum Mechanics',
        step: {
            id: 2,
            tag: 'fundamentals',
            desc: 'Wave-Particle Duality and the Double-Slit Experiment',
            compiler: 'js',
            complexity: 4
        }
    },
    {
        topic: 'Neural Networks',
        step: {
            id: 3,
            tag: 'architecture',
            desc: 'Backpropagation Algorithm Through Hidden Layers',
            compiler: 'js',
            complexity: 4
        }
    },
    {
        topic: 'Organic Chemistry',
        step: {
            id: 4,
            tag: 'reactions',
            desc: 'SN2 Nucleophilic Substitution Mechanism',
            compiler: 'js',
            complexity: 3
        }
    },
    {
        topic: 'Calculus',
        step: {
            id: 5,
            tag: 'derivatives',
            desc: 'Chain Rule for Composite Functions',
            compiler: 'js',
            complexity: 3
        }
    }
];
exports.TEST_CASES = TEST_CASES;
async function testSingleStep(testCase) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Testing: ${testCase.topic}`);
    console.log(`📝 Step: ${testCase.step.desc}`);
    console.log(`${'='.repeat(80)}\n`);
    const startTime = Date.now();
    try {
        const result = await (0, codegenV3_1.default)(testCase.step, testCase.topic);
        const genTime = Date.now() - startTime;
        if (!result) {
            return {
                topic: testCase.topic,
                stepDesc: testCase.step.desc,
                success: false,
                totalOperations: 0,
                generationTimeMs: genTime,
                operationBreakdown: {},
                hasAnimations: false,
                hasCustomPaths: false,
                hasScientificLabels: false,
                error: 'codegenV3 returned null'
            };
        }
        // Analyze operations
        const operations = result.actions;
        const opBreakdown = operations.reduce((acc, op) => {
            acc[op.op] = (acc[op.op] || 0) + 1;
            return acc;
        }, {});
        // Check for animation operations
        const animationOps = ['animate', 'particle', 'wave', 'orbit'];
        const hasAnimations = animationOps.some(op => opBreakdown[op] > 0);
        // Check for custom paths (indicates complex shapes)
        const hasCustomPaths = (opBreakdown['customPath'] || 0) > 0;
        // Check for scientific labels (not generic "Label 1" type)
        const labels = operations
            .filter(op => op.op === 'drawLabel')
            .map((op) => op.text || '');
        const hasScientificLabels = labels.length > 0 &&
            labels.some(label => label.length > 5 &&
                !/^(label|text|part)\s*\d+$/i.test(label));
        const metrics = {
            topic: testCase.topic,
            stepDesc: testCase.step.desc,
            success: true,
            totalOperations: operations.length,
            generationTimeMs: genTime,
            operationBreakdown: opBreakdown,
            hasAnimations,
            hasCustomPaths,
            hasScientificLabels
        };
        // Print results
        console.log(`\n✅ SUCCESS`);
        console.log(`⏱️  Generation Time: ${(genTime / 1000).toFixed(2)}s`);
        console.log(`📊 Total Operations: ${operations.length}`);
        console.log(`🎬 Has Animations: ${hasAnimations ? '✅' : '❌'}`);
        console.log(`🎨 Has Custom Paths: ${hasCustomPaths ? '✅' : '❌'}`);
        console.log(`🔬 Has Scientific Labels: ${hasScientificLabels ? '✅' : '❌'}`);
        console.log(`\n📋 Operation Breakdown:`);
        Object.entries(opBreakdown).forEach(([op, count]) => {
            console.log(`   ${op}: ${count}`);
        });
        if (labels.length > 0) {
            console.log(`\n🏷️  Sample Labels (first 5):`);
            labels.slice(0, 5).forEach(label => {
                console.log(`   "${label}"`);
            });
        }
        return metrics;
    }
    catch (error) {
        const genTime = Date.now() - startTime;
        console.log(`\n❌ FAILED: ${error}`);
        return {
            topic: testCase.topic,
            stepDesc: testCase.step.desc,
            success: false,
            totalOperations: 0,
            generationTimeMs: genTime,
            operationBreakdown: {},
            hasAnimations: false,
            hasCustomPaths: false,
            hasScientificLabels: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function runAllTests() {
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  PRECISION-GUIDED V3 PIPELINE TEST SUITE                   ║
║                                                                            ║
║  Testing: Two-Stage Architecture (SubPlanner → Visual Executor)           ║
║  Expected: 40+ operations, contextual content, NO fallbacks               ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
    const allMetrics = [];
    // Test one at a time to avoid rate limits
    for (const testCase of TEST_CASES) {
        const metrics = await testSingleStep(testCase);
        allMetrics.push(metrics);
        // Wait between tests to respect rate limits
        if (TEST_CASES.indexOf(testCase) < TEST_CASES.length - 1) {
            console.log(`\n⏳ Waiting 3 seconds before next test...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    // Summary
    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`                           FINAL SUMMARY`);
    console.log(`${'═'.repeat(80)}\n`);
    const successful = allMetrics.filter(m => m.success).length;
    const total = allMetrics.length;
    const successRate = (successful / total * 100).toFixed(1);
    console.log(`✅ Success Rate: ${successful}/${total} (${successRate}%)`);
    console.log(`⏱️  Average Time: ${(allMetrics.reduce((sum, m) => sum + m.generationTimeMs, 0) / total / 1000).toFixed(2)}s`);
    console.log(`📊 Average Operations: ${(allMetrics.reduce((sum, m) => sum + m.totalOperations, 0) / total).toFixed(0)}`);
    console.log(`🎬 Animation Usage: ${allMetrics.filter(m => m.hasAnimations).length}/${total} steps`);
    console.log(`🎨 Custom Paths Usage: ${allMetrics.filter(m => m.hasCustomPaths).length}/${total} steps`);
    console.log(`🔬 Scientific Labels: ${allMetrics.filter(m => m.hasScientificLabels).length}/${total} steps`);
    console.log(`\n📊 PER-TOPIC RESULTS:\n`);
    allMetrics.forEach(m => {
        const status = m.success ? '✅' : '❌';
        console.log(`${status} ${m.topic}`);
        console.log(`   Operations: ${m.totalOperations}, Time: ${(m.generationTimeMs / 1000).toFixed(1)}s`);
        if (m.error) {
            console.log(`   Error: ${m.error}`);
        }
        console.log();
    });
    // Quality checks
    console.log(`${'═'.repeat(80)}`);
    console.log(`                         QUALITY ASSESSMENT`);
    console.log(`${'═'.repeat(80)}\n`);
    const qualityChecks = [
        {
            name: 'Minimum 40 operations per step',
            pass: allMetrics.every(m => m.totalOperations >= 40),
            details: `Minimum: ${Math.min(...allMetrics.map(m => m.totalOperations))}`
        },
        {
            name: 'Generation time under 60 seconds',
            pass: allMetrics.every(m => m.generationTimeMs < 60000),
            details: `Maximum: ${(Math.max(...allMetrics.map(m => m.generationTimeMs)) / 1000).toFixed(1)}s`
        },
        {
            name: 'All steps use animations',
            pass: allMetrics.every(m => m.hasAnimations),
            details: `${allMetrics.filter(m => m.hasAnimations).length}/${total} with animations`
        },
        {
            name: 'All steps use scientific labels',
            pass: allMetrics.every(m => m.hasScientificLabels),
            details: `${allMetrics.filter(m => m.hasScientificLabels).length}/${total} with scientific terms`
        },
        {
            name: '80%+ success rate',
            pass: successful / total >= 0.8,
            details: `${successRate}% success`
        }
    ];
    qualityChecks.forEach(check => {
        const icon = check.pass ? '✅' : '❌';
        console.log(`${icon} ${check.name}`);
        console.log(`   ${check.details}\n`);
    });
    const allPassed = qualityChecks.every(c => c.pass);
    console.log(`${'═'.repeat(80)}`);
    if (allPassed) {
        console.log(`✅ ALL QUALITY CHECKS PASSED - PRODUCTION READY`);
    }
    else {
        console.log(`⚠️  SOME QUALITY CHECKS FAILED - NEEDS IMPROVEMENT`);
    }
    console.log(`${'═'.repeat(80)}\n`);
    return { allMetrics, qualityChecks, allPassed };
}
// Run if executed directly
if (require.main === module) {
    runAllTests()
        .then(({ allPassed }) => {
        process.exit(allPassed ? 0 : 1);
    })
        .catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}
