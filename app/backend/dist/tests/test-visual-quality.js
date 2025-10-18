"use strict";
/**
 * VISUAL QUALITY UNIT TEST
 *
 * Tests if codegenV3 produces detailed, high-quality visuals
 * Benchmark: Output should be understandable by "the dumbest student"
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codegenV3_1 = require("../agents/codegenV3");
const logger_1 = require("../logger");
// Test cases covering different domains
const TEST_CASES = [
    {
        domain: 'Biology',
        topic: 'Human Heart',
        step: { id: 1, desc: 'Show the four chambers of the heart with blood flow', compiler: 'js', complexity: 8 },
        qualityCriteria: {
            minPaths: 15, // Complex anatomical structures need many paths
            minAnimations: 3, // Blood flow animations
            minLabels: 8, // Chamber names, vessel labels
            requiresPointers: true,
            avoidBasicShapes: true // Should use paths, not circles/rects for organs
        }
    },
    {
        domain: 'Physics',
        topic: 'Wave Interference',
        step: { id: 2, desc: 'Demonstrate constructive and destructive interference of two waves', compiler: 'svg', complexity: 7 },
        qualityCriteria: {
            minPaths: 10, // Wave forms as paths
            minAnimations: 4, // Wave motion
            minLabels: 6, // Amplitude, wavelength labels
            requiresPointers: true,
            avoidBasicShapes: false // Waves can use sinusoidal paths
        }
    },
    {
        domain: 'Chemistry',
        topic: 'Benzene Structure',
        step: { id: 3, desc: 'Show resonance structures of benzene with electron delocalization', compiler: 'svg', complexity: 7 },
        qualityCriteria: {
            minPaths: 8, // Hexagonal ring + bonds
            minAnimations: 2, // Electron movement
            minLabels: 7, // Carbon atoms, hydrogen labels
            requiresPointers: true,
            avoidBasicShapes: true // Molecular geometry needs proper paths
        }
    },
    {
        domain: 'Mathematics',
        topic: 'Sine and Cosine Functions',
        step: { id: 4, desc: 'Graph sine and cosine on same axes showing phase difference', compiler: 'svg', complexity: 6 },
        qualityCriteria: {
            minPaths: 5, // Two curves + axes
            minAnimations: 2, // Point tracing curves
            minLabels: 8, // Axis labels, function names, key points
            requiresPointers: true,
            avoidBasicShapes: false // Graphs are naturally path-based
        }
    },
    {
        domain: 'Computer Science',
        topic: 'Binary Search Tree',
        step: { id: 5, desc: 'Illustrate insertion process in a binary search tree', compiler: 'svg', complexity: 6 },
        qualityCriteria: {
            minPaths: 6, // Tree edges
            minAnimations: 3, // Node insertion animation
            minLabels: 10, // Node values, tree properties
            requiresPointers: true,
            avoidBasicShapes: false // Tree nodes can be circles/rects with values
        }
    }
];
/**
 * Analyze SVG quality metrics
 */
function analyzeVisualQuality(svgCode, criteria) {
    const issues = [];
    // Count elements
    const pathCount = (svgCode.match(/<path/g) || []).length;
    const circleCount = (svgCode.match(/<circle/g) || []).length;
    const rectCount = (svgCode.match(/<rect/g) || []).length;
    const ellipseCount = (svgCode.match(/<ellipse/g) || []).length;
    const polygonCount = (svgCode.match(/<polygon/g) || []).length;
    const lineCount = (svgCode.match(/<line/g) || []).length;
    const animateCount = (svgCode.match(/<animate[^>]*>/g) || []).length;
    const animateMotionCount = (svgCode.match(/<animateMotion/g) || []).length;
    const animateTransformCount = (svgCode.match(/<animateTransform/g) || []).length;
    const totalAnimations = animateCount + animateMotionCount + animateTransformCount;
    const labelCount = (svgCode.match(/<text/g) || []).length;
    // Count pointers (arrows, arrowheads, defs with markers)
    const arrowMarkerCount = (svgCode.match(/marker-end|marker-start|arrowhead/gi) || []).length;
    const pointerCount = arrowMarkerCount + (svgCode.match(/<marker/g) || []).length;
    // Calculate basic shape ratio
    const totalShapes = pathCount + circleCount + rectCount + ellipseCount + polygonCount + lineCount;
    const basicShapes = circleCount + rectCount;
    const basicShapeRatio = totalShapes > 0 ? basicShapes / totalShapes : 1;
    // Check for complex paths (bezier curves, multiple points)
    const pathMatches = svgCode.match(/<path[^>]*d="[^"]*"/g) || [];
    const hasComplexPaths = pathMatches.some(path => {
        const dAttr = path.match(/d="([^"]*)"/)?.[1] || '';
        return dAttr.includes('C') || dAttr.includes('Q') || dAttr.includes('S') || dAttr.split(/[ML]/).length > 5;
    });
    // Extract unique colors
    const colorMatches = svgCode.match(/(?:fill|stroke)="([^"]*)"/g) || [];
    const uniqueColors = new Set(colorMatches.map(m => m.split('"')[1].toLowerCase()));
    const colorVariety = uniqueColors.size;
    // Validate against criteria
    if (pathCount < criteria.minPaths) {
        issues.push(`Insufficient paths: ${pathCount} < ${criteria.minPaths} (needs more detailed structures)`);
    }
    if (totalAnimations < criteria.minAnimations) {
        issues.push(`Insufficient animations: ${totalAnimations} < ${criteria.minAnimations} (needs more teaching animations)`);
    }
    if (labelCount < criteria.minLabels) {
        issues.push(`Insufficient labels: ${labelCount} < ${criteria.minLabels} (needs better annotation)`);
    }
    if (criteria.requiresPointers && pointerCount === 0) {
        issues.push(`No pointers/arrows found (needs visual guidance)`);
    }
    if (criteria.avoidBasicShapes && basicShapeRatio > 0.6) {
        issues.push(`Too many basic shapes: ${(basicShapeRatio * 100).toFixed(0)}% (should use complex paths)`);
    }
    if (!hasComplexPaths && criteria.avoidBasicShapes) {
        issues.push(`No complex SVG paths found (structures appear too simple)`);
    }
    if (colorVariety < 4) {
        issues.push(`Low color variety: ${colorVariety} colors (needs visual richness)`);
    }
    return {
        pathCount,
        animationCount: totalAnimations,
        labelCount,
        pointerCount,
        basicShapeRatio,
        colorVariety,
        hasComplexPaths,
        svgLength: svgCode.length,
        passed: issues.length === 0,
        issues
    };
}
/**
 * Run quality test on a single case
 */
async function testVisualCase(testCase) {
    logger_1.logger.info(`\n${'='.repeat(80)}`);
    logger_1.logger.info(`🧪 Testing: ${testCase.domain} - ${testCase.topic}`);
    logger_1.logger.info(`📝 Description: ${testCase.step.desc}`);
    logger_1.logger.info(`${'='.repeat(80)}`);
    try {
        const result = await (0, codegenV3_1.codegenV3)(testCase.step, testCase.topic);
        if (!result || !result.actions || result.actions.length === 0) {
            logger_1.logger.error(`❌ FAILED: No output generated`);
            return false;
        }
        const svgCode = result.actions[0].svgCode;
        if (!svgCode) {
            logger_1.logger.error(`❌ FAILED: No SVG code in output`);
            return false;
        }
        // Analyze quality
        const metrics = analyzeVisualQuality(svgCode, testCase.qualityCriteria);
        // Log metrics
        logger_1.logger.info(`\n📊 QUALITY METRICS:`);
        logger_1.logger.info(`  Paths: ${metrics.pathCount} (min: ${testCase.qualityCriteria.minPaths})`);
        logger_1.logger.info(`  Animations: ${metrics.animationCount} (min: ${testCase.qualityCriteria.minAnimations})`);
        logger_1.logger.info(`  Labels: ${metrics.labelCount} (min: ${testCase.qualityCriteria.minLabels})`);
        logger_1.logger.info(`  Pointers/Arrows: ${metrics.pointerCount}`);
        logger_1.logger.info(`  Basic Shape Ratio: ${(metrics.basicShapeRatio * 100).toFixed(0)}%`);
        logger_1.logger.info(`  Color Variety: ${metrics.colorVariety} unique colors`);
        logger_1.logger.info(`  Complex Paths: ${metrics.hasComplexPaths ? 'YES ✓' : 'NO ✗'}`);
        logger_1.logger.info(`  SVG Length: ${metrics.svgLength} chars`);
        if (metrics.passed) {
            logger_1.logger.info(`\n✅ PASSED: Visual quality meets all criteria`);
            return true;
        }
        else {
            logger_1.logger.warn(`\n⚠️ FAILED: Quality issues detected:`);
            metrics.issues.forEach(issue => logger_1.logger.warn(`  - ${issue}`));
            return false;
        }
    }
    catch (error) {
        logger_1.logger.error(`❌ EXCEPTION: ${error.message}`);
        return false;
    }
}
/**
 * Main test runner
 */
async function runVisualQualityTests() {
    logger_1.logger.info(`\n${'#'.repeat(80)}`);
    logger_1.logger.info(`# VISUAL QUALITY UNIT TESTS`);
    logger_1.logger.info(`# Benchmark: "Dumbest student should understand"`);
    logger_1.logger.info(`# Testing ${TEST_CASES.length} cases across different domains`);
    logger_1.logger.info(`${'#'.repeat(80)}\n`);
    const results = {};
    let passCount = 0;
    for (const testCase of TEST_CASES) {
        const passed = await testVisualCase(testCase);
        results[`${testCase.domain}: ${testCase.topic}`] = passed;
        if (passed)
            passCount++;
        // Wait between tests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    // Summary
    logger_1.logger.info(`\n${'#'.repeat(80)}`);
    logger_1.logger.info(`# TEST SUMMARY`);
    logger_1.logger.info(`${'#'.repeat(80)}`);
    logger_1.logger.info(`Total: ${TEST_CASES.length}`);
    logger_1.logger.info(`Passed: ${passCount}`);
    logger_1.logger.info(`Failed: ${TEST_CASES.length - passCount}`);
    logger_1.logger.info(`Success Rate: ${((passCount / TEST_CASES.length) * 100).toFixed(1)}%`);
    logger_1.logger.info(`\n📋 DETAILED RESULTS:`);
    Object.entries(results).forEach(([name, passed]) => {
        logger_1.logger.info(`  ${passed ? '✅' : '❌'} ${name}`);
    });
    const overallPass = passCount >= TEST_CASES.length * 0.8; // 80% pass rate
    logger_1.logger.info(`\n${overallPass ? '🎉 OVERALL: PASSED' : '❌ OVERALL: FAILED'}`);
    logger_1.logger.info(`${overallPass ? 'Visual quality improvements are working!' : 'Visual quality needs more tuning'}`);
    logger_1.logger.info(`${'#'.repeat(80)}\n`);
    process.exit(overallPass ? 0 : 1);
}
// Run tests
runVisualQualityTests().catch(error => {
    logger_1.logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
//# sourceMappingURL=test-visual-quality.js.map