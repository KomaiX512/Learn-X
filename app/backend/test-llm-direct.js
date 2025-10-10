const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testDirectLLM() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { 
      temperature: 0.7,
      maxOutputTokens: 5000,
      topK: 40,
      topP: 0.9
    },
    systemInstruction: 'You are a visual operation generator. Output ONLY valid JSON array of operations.'
  });

  const prompt = `Generate 20 operations for visualizing "Photosynthesis in Plant Cells".

REQUIRED OPERATIONS (USE THESE):
- drawCellStructure with type "chloroplast"
- drawMembrane for thylakoid membrane
- drawMolecularStructure for chlorophyll
- drawMolecule for glucose (C6H12O6)
- drawOrganSystem for leaf structure

Example format:
[
  {"op": "drawCellStructure", "type": "chloroplast", "x": 0.5, "y": 0.5, "size": 0.2},
  {"op": "drawMembrane", "x": 0.3, "y": 0.4, "width": 0.3},
  {"op": "drawMolecule", "formula": "C6H12O6", "x": 0.7, "y": 0.6}
]

Generate exactly 20 operations using mostly the domain-specific operations above.`;

  console.log("Testing LLM directly with domain-specific operations...\n");
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Try to parse as JSON
    let operations;
    try {
      operations = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      console.log("Raw response (not valid JSON):");
      console.log(text);
      return;
    }
    
    // Analyze operations
    console.log(`Total operations generated: ${operations.length}\n`);
    
    const opCounts = {};
    operations.forEach(op => {
      opCounts[op.op] = (opCounts[op.op] || 0) + 1;
    });
    
    console.log("Operation breakdown:");
    Object.entries(opCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([op, count]) => {
        console.log(`  ${op}: ${count}`);
      });
    
    // Check for domain-specific operations
    const domainOps = ['drawCellStructure', 'drawMembrane', 'drawMolecularStructure', 
                       'drawMolecule', 'drawOrganSystem', 'drawAtom', 'drawReaction'];
    
    const domainCount = operations.filter(op => domainOps.includes(op.op)).length;
    const customPathCount = operations.filter(op => op.op === 'customPath').length;
    
    console.log("\n🎯 Analysis:");
    console.log(`Domain-specific operations: ${domainCount}/${operations.length} (${(domainCount/operations.length*100).toFixed(1)}%)`);
    console.log(`CustomPath operations: ${customPathCount}/${operations.length} (${(customPathCount/operations.length*100).toFixed(1)}%)`);
    
    if (domainCount > 10) {
      console.log("\n✅ SUCCESS: LLM CAN generate domain-specific operations!");
      console.log("The problem is in the prompt engineering, not the LLM capability.");
    } else {
      console.log("\n❌ FAILURE: LLM refuses to use domain-specific operations!");
      console.log("Need to investigate why the model won't follow instructions.");
    }
    
    // Show first 3 operations as examples
    console.log("\nFirst 3 operations generated:");
    operations.slice(0, 3).forEach((op, i) => {
      console.log(`${i+1}. ${JSON.stringify(op)}`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testDirectLLM();
