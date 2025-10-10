const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

/**
 * UNIT TEST - TRUE GENERATION PIPELINE
 * Tests each stage independently to find failures
 */

async function testStage1_SubPlanner() {
  console.log("═══════════════════════════════════════");
  console.log("STAGE 1: SubPlanner - Create Visual Specifications");
  console.log("═══════════════════════════════════════\n");
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { 
      temperature: 0.85, 
      maxOutputTokens: 8000,
      topK: 50,
      topP: 0.95
    },
    systemInstruction: 'You are a precision visual architect. Create EXTREMELY DETAILED visual specifications. Output ONLY a JSON array of detailed instruction strings.'
  });
  
  const prompt = `Create visual specifications for:
Topic: "Photosynthesis in Plant Cells"
Step: "Introduce the chloroplast structure as the site of photosynthesis. Show the double membrane, thylakoid stacks (grana), and stroma"

Generate 5-7 detailed visual specifications. Each specification describes ONE visual element.

FORMAT for each specification (2-3 sentences):
1. What structure to create (use scientific/technical terms)
2. Shape details: customPath coordinates OR circles/rectangles with positions (x,y from 0.0-1.0)
3. Colors (hex codes like #2196F3)
4. Labels with exact text and positions
5. Any connections/arrows between elements

Your specifications will be converted into SVG operations, so be precise with:
- Coordinates (x: 0.0-1.0, y: 0.0-1.0)
- Colors (#RRGGBB format)
- Exact label text (not "Label 1" - use real scientific terms)
- Connections (from point A to point B)

Output ONLY a JSON array of strings:
["specification 1", "specification 2", "specification 3", ...]

No markdown, no explanations, just the JSON array.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log("Raw response:\n", text.substring(0, 800), "\n");
    
    // Try to parse
    let specs;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      specs = JSON.parse(cleaned);
    } catch (e) {
      console.log("❌ STAGE 1 FAILED: Invalid JSON");
      console.log("Error:", e.message);
      return null;
    }
    
    console.log(`✅ STAGE 1 SUCCESS: Generated ${specs.length} specifications\n`);
    specs.forEach((spec, i) => {
      console.log(`${i+1}. ${spec.substring(0, 150)}...`);
    });
    
    return specs;
    
  } catch (error) {
    console.log("❌ STAGE 1 ERROR:", error.message);
    return null;
  }
}

async function testStage2_OperationsGenerator(specification) {
  console.log("\n═══════════════════════════════════════");
  console.log("STAGE 2: Operations Generator - Convert Spec to SVG Operations");
  console.log("═══════════════════════════════════════\n");
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { 
      temperature: 0.8,
      maxOutputTokens: 16000,  // High limit to avoid truncation
      topK: 40,
      topP: 0.9
    },
    systemInstruction: 'You are a precision visual executor. Convert detailed specifications into exact Konva.js operations. Output ONLY valid JSON array. Follow specifications EXACTLY.'
  });
  
  const prompt = `🎯 SPECIFICATION TO EXECUTE:
${specification}

📐 YOUR TASK: Convert this specification into 10-20 operations using customPath for structures

🎨 OPERATION TYPES YOU CAN USE:

1. customPath - MAIN TOOL for creating shapes:
   - Cells, molecules, atoms, circuits, diagrams, anything!
   - Use proper SVG path commands: M (move), L (line), C (curve), Z (close)
   - Example: "M 0.3,0.2 L 0.5,0.4 C 0.6,0.5 0.7,0.5 0.8,0.4 Z"

2. drawLabel - Add text labels (x, y, text, fontSize)

3. drawTitle - Main title for the visual (text, y, size)

4. particle - Animated particles (x, y, count, spread, speed, lifetime, color)

5. wave - Wave animations (startX, startY, width, amplitude, frequency, speed, color)

6. orbit - Orbital motion (centerX, centerY, radius, period, objectRadius, color)

7. delay - Pause between operations (ms)

📋 EXECUTION RULES (CRITICAL - MUST FOLLOW):
1. Follow specification coordinates EXACTLY (don't change positions)
2. Use exact colors specified (hex codes or rgba)
3. Use exact label text from specification (scientific terminology)
4. Create ALL structures mentioned in specification
5. Add connections/arrows as specified
6. Use customPath for ANY complex shape
7. Coordinates MUST be 0.0-1.0 range

OUTPUT FORMAT:
[{"op":"customPath","path":"M 0.2,0.3 L...","stroke":"#2196F3","strokeWidth":2},{"op":"drawLabel","text":"Chloroplast","x":0.5,"y":0.1,"fontSize":16}]

Output ONLY the JSON array, no markdown, no explanations.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log(`Response length: ${text.length} characters\n`);
    console.log("First 500 chars:\n", text.substring(0, 500), "\n");
    
    // Try to parse
    let operations;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      operations = JSON.parse(cleaned);
    } catch (e) {
      console.log("❌ STAGE 2 FAILED: Invalid JSON");
      console.log("Error:", e.message);
      console.log("\nAttempting to extract operations...");
      
      // Try to extract individual operations
      const matches = Array.from(text.matchAll(/\{[^{}]*"op"[^{}]*\}/g));
      if (matches.length > 0) {
        operations = matches.map(m => {
          try {
            return JSON.parse(m[0]);
          } catch {
            return null;
          }
        }).filter(op => op !== null);
        console.log(`Extracted ${operations.length} operations via fallback`);
      } else {
        return null;
      }
    }
    
    console.log(`✅ STAGE 2 SUCCESS: Generated ${operations.length} operations\n`);
    
    // Analyze operations
    const opCounts = {};
    let truncated = [];
    operations.forEach((op, i) => {
      opCounts[op.op] = (opCounts[op.op] || 0) + 1;
      
      // Check for truncated text
      if (op.text && (op.text.endsWith(' ') || op.text.length > 100)) {
        truncated.push({index: i, op: op.op, text: op.text});
      }
    });
    
    console.log("Operation breakdown:");
    Object.entries(opCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([op, count]) => {
        console.log(`  ${op}: ${count}`);
      });
    
    if (truncated.length > 0) {
      console.log("\n⚠️ WARNING: Possible truncated text detected:");
      truncated.forEach(t => {
        console.log(`  ${t.index}. ${t.op}: "${t.text.substring(0, 80)}..."`);
      });
    }
    
    // Show first 3 operations
    console.log("\nFirst 3 operations:");
    operations.slice(0, 3).forEach((op, i) => {
      console.log(`${i+1}. ${JSON.stringify(op).substring(0, 150)}...`);
    });
    
    return operations;
    
  } catch (error) {
    console.log("❌ STAGE 2 ERROR:", error.message);
    return null;
  }
}

async function runFullTest() {
  console.log("\n🧪 TRUE GENERATION PIPELINE TEST\n");
  console.log("Testing: Description → Specifications → SVG Operations → Render\n");
  
  // Stage 1: Generate specifications
  const specs = await testStage1_SubPlanner();
  if (!specs || specs.length === 0) {
    console.log("\n❌ TEST FAILED at Stage 1");
    return;
  }
  
  // Stage 2: Convert first specification to operations
  console.log("\nTesting first specification conversion...");
  const operations = await testStage2_OperationsGenerator(specs[0]);
  
  if (!operations || operations.length === 0) {
    console.log("\n❌ TEST FAILED at Stage 2");
    return;
  }
  
  // Final verdict
  console.log("\n═══════════════════════════════════════");
  console.log("FINAL VERDICT");
  console.log("═══════════════════════════════════════\n");
  
  console.log(`✅ Stage 1: ${specs.length} specifications generated`);
  console.log(`✅ Stage 2: ${operations.length} operations generated`);
  
  const customPathCount = operations.filter(op => op.op === 'customPath').length;
  const labelCount = operations.filter(op => op.op === 'drawLabel' || op.op === 'drawTitle').length;
  
  console.log(`\nOperation quality:`);
  console.log(`  customPath (structures): ${customPathCount}`);
  console.log(`  labels/titles: ${labelCount}`);
  console.log(`  animations: ${operations.length - customPathCount - labelCount}`);
  
  if (customPathCount > 5) {
    console.log("\n✅ TRUE GENERATION WORKING: Using customPath for complex structures!");
  } else {
    console.log("\n⚠️ LOW QUALITY: Not enough complex structures generated");
  }
  
  if (operations.some(op => op.text && op.text.length > 150)) {
    console.log("⚠️ WARNING: Some text may be truncated");
  } else {
    console.log("✅ No text truncation detected");
  }
}

runFullTest();
