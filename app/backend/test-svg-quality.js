/**
 * TEST SVG QUALITY - Shows the INSANE quality of our prompts
 * This demonstrates what we're asking the LLM to generate
 */

const { createInsaneQualityPrompt, validateQuality } = require('./dist/agents/svgMasterGenerator.js');

// Example of what INSANE quality looks like
const EXAMPLE_INSANE_OPERATIONS = [
  // Complex chloroplast structure
  {
    op: 'customPath',
    path: `M 0.2,0.5 
           C 0.2,0.3 0.3,0.2 0.5,0.2
           C 0.7,0.2 0.8,0.3 0.8,0.5
           C 0.8,0.7 0.7,0.8 0.5,0.8
           C 0.3,0.8 0.2,0.7 0.2,0.5 Z
           M 0.25,0.5
           C 0.25,0.35 0.35,0.25 0.5,0.25
           C 0.65,0.25 0.75,0.35 0.75,0.5
           C 0.75,0.65 0.65,0.75 0.5,0.75
           C 0.35,0.75 0.25,0.65 0.25,0.5 Z
           M 0.35,0.4 L 0.65,0.4 M 0.35,0.45 L 0.65,0.45 
           M 0.35,0.5 L 0.65,0.5 M 0.35,0.55 L 0.65,0.55 
           M 0.35,0.6 L 0.65,0.6`,
    stroke: '#27ae60',
    strokeWidth: 2,
    fill: 'rgba(39, 174, 96, 0.15)'
  },
  // Rich scientific labels
  { op: 'drawLabel', text: 'Outer Membrane', x: 0.15, y: 0.45, fontSize: 14, color: '#2c3e50' },
  { op: 'drawLabel', text: 'Inner Membrane', x: 0.22, y: 0.52, fontSize: 14, color: '#2c3e50' },
  { op: 'drawLabel', text: 'Thylakoid Stacks (Grana)', x: 0.5, y: 0.38, fontSize: 16, color: '#27ae60' },
  { op: 'drawLabel', text: 'Stroma (Fluid Matrix)', x: 0.5, y: 0.62, fontSize: 14, color: '#34495e' },
  { op: 'drawLabel', text: 'Lumen (Internal Space)', x: 0.5, y: 0.48, fontSize: 12, color: '#7f8c8d' },
  
  // Complex DNA helix
  {
    op: 'customPath',
    path: `M 0.3,0.1
           Q 0.35,0.2 0.4,0.25
           T 0.5,0.35
           Q 0.55,0.4 0.6,0.45
           T 0.7,0.55
           Q 0.75,0.6 0.8,0.65
           T 0.85,0.75
           M 0.7,0.1
           Q 0.65,0.2 0.6,0.25
           T 0.5,0.35
           Q 0.45,0.4 0.4,0.45
           T 0.3,0.55
           Q 0.25,0.6 0.2,0.65
           T 0.15,0.75
           M 0.35,0.2 L 0.65,0.2
           M 0.4,0.3 L 0.6,0.3
           M 0.45,0.4 L 0.55,0.4
           M 0.4,0.5 L 0.6,0.5
           M 0.35,0.6 L 0.65,0.6
           M 0.3,0.7 L 0.7,0.7`,
    stroke: '#3498db',
    strokeWidth: 3,
    fill: 'none'
  },
  
  // Photon particles
  { op: 'particle', x: 0.2, y: 0.2, count: 15, spread: 0.2, speed: 0.025, lifetime: 3000, color: '#FFD700' },
  { op: 'particle', x: 0.3, y: 0.25, count: 12, spread: 0.15, speed: 0.02, lifetime: 2500, color: '#FFA500' },
  
  // Energy waves
  { op: 'wave', startX: 0.1, startY: 0.3, width: 0.8, amplitude: 0.05, frequency: 4, speed: 0.5, color: '#9b59b6' },
  { op: 'wave', startX: 0.1, startY: 0.35, width: 0.8, amplitude: 0.04, frequency: 5, speed: 0.6, color: '#8e44ad' },
  
  // ATP molecules with orbiting phosphates
  { op: 'orbit', centerX: 0.8, centerY: 0.7, radius: 0.05, period: 3, objectRadius: 0.01, color: '#e74c3c' },
  { op: 'orbit', centerX: 0.82, centerY: 0.68, radius: 0.04, period: 2.5, objectRadius: 0.008, color: '#c0392b' },
  
  // More scientific labels
  { op: 'drawLabel', text: 'Photosystem II (P680)', x: 0.25, y: 0.15, fontSize: 14, color: '#2980b9' },
  { op: 'drawLabel', text: 'Photosystem I (P700)', x: 0.75, y: 0.15, fontSize: 14, color: '#2980b9' },
  { op: 'drawLabel', text: 'ATP Synthase Complex', x: 0.8, y: 0.75, fontSize: 14, color: '#c0392b' },
  { op: 'drawLabel', text: 'H⁺ Proton Gradient', x: 0.5, y: 0.7, fontSize: 12, color: '#f39c12' },
  { op: 'drawLabel', text: 'NADPH Production Site', x: 0.85, y: 0.5, fontSize: 12, color: '#16a085' },
  
  // Chemical equations
  { op: 'drawLatex', equation: '6CO_2 + 6H_2O + light \\rightarrow C_6H_{12}O_6 + 6O_2', x: 0.5, y: 0.9, size: 16 },
  { op: 'drawLatex', equation: 'ATP: ADP + P_i + energy', x: 0.8, y: 0.8, size: 14 },
  
  // Connection vectors
  { op: 'drawVector', x1: 0.25, y1: 0.5, x2: 0.75, y2: 0.5, color: '#e67e22', width: 2 },
  { op: 'drawVector', x1: 0.5, y1: 0.35, x2: 0.5, y2: 0.65, color: '#d35400', width: 2 }
];

console.log("═══════════════════════════════════════════════════════");
console.log("🚀 SVG MASTER QUALITY DEMONSTRATION");
console.log("═══════════════════════════════════════════════════════\n");

// Show what our prompt looks like
console.log("📝 INSANE QUALITY PROMPT STRUCTURE:");
console.log("────────────────────────────────────────");
const examplePrompt = createInsaneQualityPrompt(
  "Photosynthesis in Plant Cells",
  "Show the light-dependent reactions in the chloroplast thylakoid membrane"
);
console.log(examplePrompt.substring(0, 1500) + "...\n");

// Test quality validation
console.log("🎯 QUALITY VALIDATION TEST:");
console.log("────────────────────────────────────────");

// Test with LOW quality (simple shapes)
const LOW_QUALITY_OPS = [
  { op: 'customPath', path: 'M 0.1,0.5 L 0.9,0.5' }, // Just a line
  { op: 'drawCircle', x: 0.5, y: 0.5, radius: 0.1 },
  { op: 'drawRect', x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
  { op: 'drawLabel', text: 'Cell', x: 0.5, y: 0.2 },
  { op: 'drawLabel', text: 'Nucleus', x: 0.5, y: 0.5 }
];

const lowQualityResult = validateQuality(LOW_QUALITY_OPS);
console.log("❌ LOW QUALITY EXAMPLE:");
console.log(`  Operations: ${LOW_QUALITY_OPS.length}`);
console.log(`  Score: ${lowQualityResult.score}/100`);
console.log(`  Valid: ${lowQualityResult.valid}`);
console.log(`  Issues: ${lowQualityResult.issues.join(', ')}\n`);

// Test with INSANE quality
const insaneQualityResult = validateQuality(EXAMPLE_INSANE_OPERATIONS);
console.log("✅ INSANE QUALITY EXAMPLE:");
console.log(`  Operations: ${EXAMPLE_INSANE_OPERATIONS.length}`);
console.log(`  Score: ${insaneQualityResult.score}/100`);
console.log(`  Valid: ${insaneQualityResult.valid}`);
console.log(`  Issues: ${insaneQualityResult.issues.join(', ') || 'None'}\n`);

// Show operation breakdown
const opCounts = {};
EXAMPLE_INSANE_OPERATIONS.forEach(op => {
  opCounts[op.op] = (opCounts[op.op] || 0) + 1;
});

console.log("📊 INSANE QUALITY OPERATION BREAKDOWN:");
console.log("────────────────────────────────────────");
Object.entries(opCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([op, count]) => {
    const percent = Math.round(count / EXAMPLE_INSANE_OPERATIONS.length * 100);
    console.log(`  ${op}: ${count} (${percent}%)`);
  });

// Show path complexity
console.log("\n🔬 PATH COMPLEXITY ANALYSIS:");
console.log("────────────────────────────────────────");
EXAMPLE_INSANE_OPERATIONS
  .filter(op => op.op === 'customPath')
  .forEach((op, i) => {
    const commands = op.path.match(/[MLCQATZ]/gi);
    const complexity = commands ? commands.length : 0;
    console.log(`  Path ${i+1}: ${complexity} commands (${complexity >= 10 ? '✅ Complex' : '❌ Too simple'})`);
  });

console.log("\n═══════════════════════════════════════════════════════");
console.log("🎯 KEY INSIGHTS:");
console.log("═══════════════════════════════════════════════════════\n");

console.log("1. COMPLEXITY MATTERS:");
console.log("   - Simple line (M L): Score penalty");
console.log("   - Complex path (M C Q T L...): High score bonus\n");

console.log("2. RICH LABELING:");
console.log("   - Scientific terms boost quality");
console.log("   - Equations and formulas add educational value\n");

console.log("3. LAYERED VISUALS:");
console.log("   - Background (grids, coordinates)");
console.log("   - Structure (complex paths)");
console.log("   - Details (labels, annotations)");
console.log("   - Animation (particles, waves)\n");

console.log("4. TARGET METRICS:");
console.log("   - 50+ operations per visual");
console.log("   - 30-40% complex customPath");
console.log("   - 20-30% scientific labels");
console.log("   - 10-15% animations");
console.log("   - Path complexity: 10+ commands\n");

console.log("📈 QUALITY SCORING:");
console.log("   0-49:  ❌ Rejected (too simple)");
console.log("   50-79: ⚠️  Acceptable (needs improvement)");
console.log("   80-100: ✅ INSANE (beats 3Blue1Brown)\n");

console.log("🔥 With this system, we can achieve 3Blue1Brown-beating quality!");
console.log("   The key is FORCING the LLM to generate complex, layered visuals");
console.log("   with rich scientific accuracy and beautiful animations.\n");
