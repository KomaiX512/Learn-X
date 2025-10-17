"use strict";
/**
 * QUICK FIX VERIFICATION TEST
 * Tests the two critical fixes:
 * 1. MAX_TOKENS handling
 * 2. Subtopic simplification
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
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const transcriptGenerator_1 = require("../agents/transcriptGenerator");
async function quickTest() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║          QUICK FIX VERIFICATION TEST                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    const step = {
        id: 1,
        tag: 'intuition',
        desc: 'Imagine a tiny electron, not as a mini-ball, but as a blurry cloud of probability, existing in multiple places at once.',
        compiler: 'svg'
    };
    console.log('Testing with long narrative description...');
    console.log(`Description: "${step.desc}"`);
    console.log('');
    const startTime = Date.now();
    const result = await (0, transcriptGenerator_1.generateNotes)(step, 'Quantum Mechanics', step.desc);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    if (result && result.length > 2000) {
        console.log(`✅ SUCCESS in ${duration}s`);
        console.log(`   - Length: ${result.length} chars`);
        console.log(`   - Text elements: ${(result.match(/<text/g) || []).length}`);
        console.log(`   - Contains "quantum": ${result.toLowerCase().includes('quantum') ? 'YES' : 'NO'}`);
        console.log(`   - Contains "electron": ${result.toLowerCase().includes('electron') ? 'YES' : 'NO'}`);
        console.log('');
        console.log('🎉 FIXES VERIFIED - System working!');
        process.exit(0);
    }
    else {
        console.log(`❌ FAILED in ${duration}s`);
        console.log(`   - Result: ${result ? `${result.length} chars` : 'null'}`);
        console.log('');
        console.log('⚠️ FIXES NOT WORKING - Review logs above');
        process.exit(1);
    }
}
if (require.main === module) {
    quickTest().catch(error => {
        console.error('\n💥 TEST CRASHED:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=quick-fix-test.js.map