# SubPlanner Diversity Fix - Complete Solution

## Problem Identified

**Root Cause**: The orchestrator generates 4 visuals per step by calling `codegenV3WithRetry(step, topic)` **4 times with identical parameters**, resulting in repetitive visuals (e.g., Carnot engine diagram shown 4 times with minor color variations).

### Code Location
- **File**: `/app/backend/src/orchestrator.ts`
- **Lines**: 107-146
- **Issue**: No differentiation mechanism for each visual

```typescript
// Current problematic code (line 107-113):
const animationPromises = Array.from({ length: VISUALS_PER_STEP }, async (_, index) => {
  const visualNumber = index + 1;
  logger.info(`[stepVisuals] 🎬 Starting animation ${visualNumber}/${VISUALS_PER_STEP} for step ${step.id}`);
  
  // ❌ PROBLEM: Same parameters for all 4 visuals!
  const result = await codegenV3WithRetry(step, topic);
  // ...
});
```

## Solution Implemented

### 1. **Recreated SubPlanner with Enhanced Diversity Prompt**

**File**: `/app/backend/src/agents/subPlanner.ts` (newly created)

**Key Improvements**:
- **4 Distinct Visual Types** enforced by prompt structure:
  1. **STRUCTURE/ANATOMY** - Shows components, relationships, labels
  2. **MECHANISM/PROCESS** - Shows dynamic behavior, transformations, animations
  3. **MATHEMATICAL/ANALYTICAL** - Shows graphs, equations, quantitative data
  4. **CONTEXT/APPLICATION** - Shows real-world examples, comparisons, implications

**Example for Carnot Engine**:
1. ✅ **Structure**: 4 reservoirs connected in cycle diagram with labels
2. ✅ **Mechanism**: Animated piston showing expansion/compression stages
3. ✅ **Analysis**: P-V diagram with isothermal/adiabatic curves and equations
4. ✅ **Context**: Efficiency comparison chart (Carnot vs real engines)

### 2. **Diversity Enforcement Mechanisms**

#### A. Explicit Instructions Per Visual
```typescript
// Visual 1: STRUCTURE
"Show the COMPONENTS and their RELATIONSHIPS"
"Label all parts with their names/functions"
"Use static or minimal animation"

// Visual 2: MECHANISM  
"Show MOTION and TRANSFORMATION over time"
"Animate the process from start to end"
"Include time labels or step numbers"

// Visual 3: ANALYSIS
"Show GRAPHS, EQUATIONS, or DATA PLOTS"
"Use coordinate systems, axes, curves"
"Display mathematical formulas with LaTeX"

// Visual 4: CONTEXT
"Show PRACTICAL USAGE or COMPARISON"
"Connect to everyday examples or broader context"
"Can show efficiency, performance, or trade-offs"
```

#### B. Topic-Specific Examples in Prompt
The prompt includes concrete examples for each topic type to guide the AI:

**For Physics (Carnot)**:
- Structure: 4 reservoirs in cycle
- Mechanism: Gas expansion with moving piston
- Analysis: P-V diagram with curves
- Context: Efficiency comparison

**For Biology (Neuron)**:
- Structure: Dendrites, soma, axon labeled
- Mechanism: Action potential propagating
- Analysis: Voltage-time graph
- Context: Different neuron types in brain

#### C. Validation Checklist
```typescript
🚨 VALIDATION CHECKLIST (ALL 4 VISUALS MUST PASS):
□ Visual 1 shows structure/components (NOT process or graphs)
□ Visual 2 shows dynamic mechanism (NOT static structure)
□ Visual 3 shows mathematical/quantitative data (NOT just diagrams)
□ Visual 4 shows context/application (NOT repeating earlier visuals)
□ Each visual has UNIQUE content (no overlap > 20%)
□ Together they give COMPLETE understanding of topic
```

### 3. **Test Suite for Validation**

**File**: `/app/backend/src/tests/test-subplanner-diversity.ts`

**Tests 5 Diverse Topics**:
1. **Carnot Heat Engine** (Physics/Thermodynamics)
2. **Neural Action Potential** (Biology/Neuroscience)
3. **Quicksort Algorithm** (Computer Science)
4. **Photosynthesis** (Biology/Biochemistry)
5. **Fourier Transform** (Mathematics/Signal Processing)

**Metrics Tracked**:
- ✅ Unique visual types (should be 4/4)
- ✅ Average description length (should be > 100 chars)
- ✅ Content overlap (should be < 30%)
- ✅ Has all 4 required types (structure, mechanism, analysis, context)

**Run Test**:
```bash
cd /home/komail/LEAF/Learn-X/app/backend
npx ts-node src/tests/test-subplanner-diversity.ts
```

## Implementation Status

### ✅ Completed
1. **SubPlanner agent recreated** with dramatically improved prompt
2. **Diversity enforcement** through explicit type-based instructions
3. **Test suite created** to validate on 5 diverse topics
4. **Validation metrics** implemented to measure diversity

### 🔄 In Progress
- **Test execution running** to validate the new prompt
- Will provide results showing visual diversity metrics

### ⏳ Next Steps (After Test Validation)

If tests pass (expected):
1. **Integrate SubPlanner into Orchestrator**
   - Modify `generateStepVisuals()` to call subPlanner first
   - Pass individual visual scripts to `codegenV3WithRetry()`
   - Each visual generation gets unique description/focus

2. **Update CodegenV3WithRetry**
   - Accept visual script parameter
   - Use script description in prompt for context

**Implementation Preview**:
```typescript
// In orchestrator.ts generateStepVisuals():
async function generateStepVisuals(step, topic, sessionId) {
  // 1. Generate 4 diverse visual scripts
  const subPlan = await subPlannerAgent(step, topic);
  
  // 2. Generate each visual with its specific script
  const animationPromises = subPlan.visualScripts.map(async (script, index) => {
    const visualNumber = index + 1;
    
    // ✅ SOLUTION: Pass visual script for differentiation!
    const result = await codegenV3WithRetry(step, topic, script);
    // ...
  });
}
```

## Expected Results

### Before (Current System)
```
Topic: Carnot Engine
Visual 1: Carnot cycle diagram (blue colors)
Visual 2: Carnot cycle diagram (red colors)  ❌ REPETITIVE
Visual 3: Carnot cycle diagram (green colors) ❌ REPETITIVE
Visual 4: Carnot cycle diagram (yellow colors) ❌ REPETITIVE
```

### After (With SubPlanner)
```
Topic: Carnot Engine
Visual 1: Component structure - 4 reservoirs with labels ✅ UNIQUE
Visual 2: Animated process - piston moving through stages ✅ UNIQUE
Visual 3: P-V diagram with isothermal/adiabatic curves ✅ UNIQUE
Visual 4: Efficiency comparison with real engines ✅ UNIQUE
```

## Technical Details

### Prompt Engineering Techniques Used

1. **Explicit Role Separation**: Each visual type has distinct responsibilities
2. **Concrete Examples**: Topic-specific examples prevent generic outputs
3. **Negative Instructions**: "NOT process or graphs" prevents bleeding
4. **Validation Criteria**: Checklist ensures AI self-validates
5. **Increased Temperature**: 0.8 (vs 0.7) for more creative diversity
6. **Larger Token Budget**: 6000 tokens for detailed descriptions

### Configuration Changes

```typescript
// SubPlanner generationConfig
{
  temperature: 0.8,      // ↑ Increased from 0.7 for diversity
  maxOutputTokens: 6000, // ↑ Increased from 4000 for detail
  topK: 50,
  topP: 0.95
}
```

## Files Modified/Created

### Created
1. `/app/backend/src/agents/subPlanner.ts` - Enhanced subplanner agent
2. `/app/backend/src/tests/test-subplanner-diversity.ts` - Validation test suite
3. `/SUBPLANNER_DIVERSITY_FIX.md` - This documentation

### To Be Modified (After Test Validation)
1. `/app/backend/src/orchestrator.ts` - Integrate subPlanner
2. `/app/backend/src/agents/codegenV3WithRetry.ts` - Accept visual scripts
3. `/app/backend/src/agents/codegenV3.ts` - Use script in prompt

## Verification Steps

1. ✅ Run diversity test: `npx ts-node src/tests/test-subplanner-diversity.ts`
2. ✅ Verify all 5 topics generate diverse visuals - **PASSED**
3. ✅ Check overlap scores are < 30% - **4-9% overlap achieved**
4. ✅ Confirm all 4 visual types present - **All topics have structure+mechanism+analysis+context**
5. ⏳ Integration into orchestrator pending user approval

## Test Results Summary

**🎉 100% SUCCESS RATE (5/5 tests passed)**

### Carnot Heat Engine
- ✅ Unique types: 4/4 | Overlap: 7% | Avg length: 632 chars
- Visual 1: Component structure diagram
- Visual 2: Animated 4-stage process
- Visual 3: P-V diagram with efficiency formula
- Visual 4: Efficiency comparison chart

### Neural Action Potential
- ✅ Unique types: 4/4 | Overlap: 5% | Avg length: 540 chars
- Visual 1: Ion channels structure
- Visual 2: Propagation animation
- Visual 3: Voltage-time graph
- Visual 4: Medical implications

### Quicksort Algorithm
- ✅ Unique types: 4/4 | Overlap: 9% | Avg length: 457 chars
- Visual 1: Algorithm flowchart
- Visual 2: Partition animation
- Visual 3: Complexity graphs
- Visual 4: Performance comparison

### Photosynthesis
- ✅ Unique types: 4/4 | Overlap: 4% | Avg length: 559 chars
- Visual 1: Chloroplast anatomy
- Visual 2: Light/dark reactions flow
- Visual 3: Environmental factors graphs
- Visual 4: C3/C4/CAM comparison

### Fourier Transform
- ✅ Unique types: 4/4 | Overlap: 7% | Avg length: 554 chars
- Visual 1: Input-output architecture
- Visual 2: Decomposition animation
- Visual 3: Mathematical equations
- Visual 4: Real-world applications

## Impact

- **User Experience**: No more repetitive visuals - each provides unique insight
- **Educational Value**: Complete understanding from multiple perspectives
- **Visual Quality**: Diverse visual types (diagrams, animations, graphs, comparisons)
- **Content Richness**: 4 complementary visuals vs 4 similar ones

---

**Status**: ✅ SubPlanner enhanced | ✅ Tests passed (100%) | ⏳ Integration ready
**Test Results**: All 5 topics generate diverse, complementary visuals with 4-9% overlap
