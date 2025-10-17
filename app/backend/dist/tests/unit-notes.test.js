"use strict";
/**
 * UNIT TEST: NOTES GENERATOR
 * Validates notes generator uses AI subtopic correctly
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNotesGenerator = testNotesGenerator;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const transcriptGenerator_1 = require("../agents/transcriptGenerator");
async function testNotesGenerator() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         UNIT TEST: NOTES GENERATOR (AI Subtopic)            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const testCases = [
        {
            topic: 'Quantum Mechanics',
            step: {
                id: 1,
                desc: 'Imagine an electron as a cloud of probability, existing everywhere at once until observed.',
                notesSubtopic: 'Wave-Particle Duality',
                compiler: 'js',
                complexity: 2,
                tag: 'intuition'
            },
            expectedKeywords: ['wave', 'particle', 'quantum', 'duality']
        },
        {
            topic: 'Operational Amplifiers',
            step: {
                id: 1,
                desc: 'Imagine a tiny whisper amplified thousands of times by the Op-Amp.',
                notesSubtopic: 'High-Gain Differential Amp',
                compiler: 'js',
                complexity: 2,
                tag: 'intuition'
            },
            expectedKeywords: ['op-amp', 'amplifier', 'gain', 'differential']
        },
        {
            topic: 'Neural Networks',
            step: {
                id: 1,
                desc: 'Think of neurons firing signals, learning patterns from data.',
                notesSubtopic: 'Artificial Neurons',
                compiler: 'js',
                complexity: 2,
                tag: 'intuition'
            },
            expectedKeywords: ['neuron', 'network', 'learning']
        }
    ];
    let passed = 0;
    let failed = 0;
    for (const testCase of testCases) {
        console.log(`\nTesting: "${testCase.topic}" - "${testCase.step.notesSubtopic}"`);
        console.log('─'.repeat(70));
        try {
            const startTime = Date.now();
            const result = await (0, transcriptGenerator_1.generateNotes)(testCase.step, testCase.topic, testCase.step.desc);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            if (!result || result.length < 2000) {
                console.log(`❌ FAILED: ${result ? `Too short (${result.length} chars)` : 'null result'}`);
                failed++;
                continue;
            }
            // Validate quality
            const textElements = (result.match(/<text/g) || []).length;
            const totalElements = textElements + (result.match(/<rect/g) || []).length + (result.match(/<line/g) || []).length;
            // Check contextual keywords
            const resultLower = result.toLowerCase();
            const foundKeywords = testCase.expectedKeywords.filter(kw => resultLower.includes(kw.toLowerCase()));
            const contextual = foundKeywords.length >= Math.ceil(testCase.expectedKeywords.length / 2);
            console.log(`✅ Generated in ${duration}s`);
            console.log(`   Length: ${result.length} chars`);
            console.log(`   Text elements: ${textElements}`);
            console.log(`   Total elements: ${totalElements}`);
            console.log(`   Contextual: ${contextual ? '✅ YES' : '❌ NO'}`);
            console.log(`   Keywords found: ${foundKeywords.join(', ')}`);
            if (contextual && textElements >= 25 && result.length >= 3500) {
                console.log(`✅ PASSED: High quality, contextual notes`);
                passed++;
            }
            else {
                console.log(`❌ FAILED: Quality below threshold`);
                if (!contextual)
                    console.log(`   Missing keywords: ${testCase.expectedKeywords.filter(k => !foundKeywords.includes(k)).join(', ')}`);
                failed++;
            }
        }
        catch (error) {
            console.log(`❌ EXCEPTION: ${error.message}`);
            failed++;
        }
    }
    console.log('\n' + '═'.repeat(70));
    console.log('NOTES GENERATOR UNIT TEST RESULTS');
    console.log('═'.repeat(70));
    console.log(`Passed: ${passed}/${testCases.length}`);
    console.log(`Failed: ${failed}/${testCases.length}`);
    console.log('═'.repeat(70));
    return failed === 0;
}
if (require.main === module) {
    testNotesGenerator().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('\n💥 TEST CRASHED:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=unit-notes.test.js.map