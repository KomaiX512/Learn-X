"use strict";
/**
 * COMPREHENSIVE VISUAL TOOL LIBRARY
 *
 * This defines ALL visual primitives available for ANY topic.
 * Gemini selects and composes these tools dynamically based on content.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPOSITION_PATTERNS = exports.LAYOUT_STRATEGIES = exports.VISUAL_TOOL_LIBRARY = void 0;
exports.getToolDocumentation = getToolDocumentation;
exports.VISUAL_TOOL_LIBRARY = {
    // ========================================================================
    // ELECTRICAL & ELECTRONICS
    // ========================================================================
    electrical: {
        drawCircuitElement: {
            description: "Draw electronic components with proper symbols",
            params: {
                type: "resistor | capacitor | inductor | diode | transistor_npn | transistor_pnp | mosfet | op_amp | voltage_source | current_source | ground | wire_junction",
                x: "number (0-1, normalized)",
                y: "number (0-1, normalized)",
                rotation: "number (degrees, optional)",
                label: "string (component value/name)",
                value: "string (e.g., '10k', '100uF')"
            },
            example: {
                op: "drawCircuitElement",
                type: "resistor",
                x: 0.3,
                y: 0.5,
                rotation: 0,
                label: "R1",
                value: "10kΩ"
            }
        },
        drawSignalWaveform: {
            description: "Draw time-domain signal waveforms",
            params: {
                waveform: "sine | square | triangle | sawtooth | pulse | noise | custom",
                amplitude: "number (0-1)",
                frequency: "number (Hz, optional for label)",
                phase: "number (degrees, optional)",
                x: "number (start position)",
                y: "number (center position)",
                width: "number (waveform width)",
                label: "string (signal name)",
                animate: "boolean (animate waveform)"
            },
            example: {
                op: "drawSignalWaveform",
                waveform: "sine",
                amplitude: 0.3,
                frequency: 1000,
                x: 0.1,
                y: 0.5,
                width: 0.2,
                label: "Input Signal",
                animate: true
            }
        },
        drawConnection: {
            description: "Draw wires/connections between components",
            params: {
                from: "[x, y]",
                to: "[x, y]",
                waypoints: "[[x,y], ...] (optional path points)",
                type: "wire | ground | power",
                showArrow: "boolean (for current flow)",
                label: "string (optional)"
            }
        }
    },
    // ========================================================================
    // PHYSICS & MECHANICS
    // ========================================================================
    physics: {
        drawForceVector: {
            description: "Draw force/velocity/acceleration vectors",
            params: {
                x: "number (origin x)",
                y: "number (origin y)",
                dx: "number (vector x component)",
                dy: "number (vector y component)",
                magnitude: "number (for label)",
                label: "string (e.g., 'F = 10N')",
                color: "string (vector color)",
                showMagnitude: "boolean"
            },
            example: {
                op: "drawForceVector",
                x: 0.5,
                y: 0.5,
                dx: 0.2,
                dy: 0,
                magnitude: 10,
                label: "F = 10N",
                color: "#ff0000",
                showMagnitude: true
            }
        },
        drawPhysicsObject: {
            description: "Draw physical objects (masses, particles)",
            params: {
                shape: "circle | box | sphere | custom",
                x: "number",
                y: "number",
                width: "number (or radius for circle)",
                height: "number (optional)",
                mass: "number (for label)",
                velocity: "[vx, vy] (optional, shows velocity vector)",
                label: "string",
                color: "string"
            }
        },
        drawTrajectory: {
            description: "Draw motion paths and trajectories",
            params: {
                path: "[[x,y], ...] (array of points)",
                showVelocity: "boolean (show velocity vectors along path)",
                showAcceleration: "boolean",
                pathStyle: "solid | dashed | dotted",
                animate: "boolean (animate object along path)"
            }
        },
        drawFieldLines: {
            description: "Draw electric/magnetic field lines",
            params: {
                type: "electric | magnetic | gravitational",
                sources: "[[x,y,charge], ...] (field sources)",
                density: "number (line density)",
                showArrows: "boolean (field direction)"
            }
        }
    },
    // ========================================================================
    // BIOLOGY & ANATOMY
    // ========================================================================
    biology: {
        drawCellStructure: {
            description: "Draw cell with organelles",
            params: {
                type: "animal | plant | bacteria | neuron | muscle",
                x: "number",
                y: "number",
                size: "number",
                showOrganelles: "boolean",
                organelles: "['nucleus', 'mitochondria', ...] (which to show)",
                detail: "low | medium | high",
                labels: "boolean"
            },
            example: {
                op: "drawCellStructure",
                type: "neuron",
                x: 0.5,
                y: 0.5,
                size: 0.3,
                showOrganelles: true,
                organelles: ["nucleus", "dendrites", "axon"],
                detail: "high",
                labels: true
            }
        },
        drawOrganSystem: {
            description: "Draw organ or body system",
            params: {
                organ: "heart | brain | lung | kidney | digestive | circulatory | nervous",
                style: "schematic | realistic | simplified",
                showLabels: "boolean",
                highlightParts: "[...] (parts to highlight)",
                showFlow: "boolean (for circulatory, digestive)"
            }
        },
        drawMolecularStructure: {
            description: "Draw proteins, DNA, molecules",
            params: {
                type: "protein | dna | rna | enzyme",
                structure: "primary | secondary | tertiary",
                sequence: "string (amino acids or bases)",
                style: "ribbon | space_filling | stick",
                showBonds: "boolean"
            }
        },
        drawMembrane: {
            description: "Draw cell membrane with proteins",
            params: {
                x: "number",
                y: "number",
                width: "number",
                showProteins: "boolean",
                showChannels: "boolean",
                showTransport: "boolean (active/passive)"
            }
        }
    },
    // ========================================================================
    // CHEMISTRY
    // ========================================================================
    chemistry: {
        drawAtom: {
            description: "Draw atomic structure",
            params: {
                element: "H | C | O | N | ... (element symbol)",
                x: "number",
                y: "number",
                showElectrons: "boolean",
                showNucleus: "boolean",
                showOrbitals: "boolean",
                label: "string"
            }
        },
        drawMolecule: {
            description: "Draw chemical molecule with bonds",
            params: {
                formula: "string (e.g., 'H2O', 'C6H12O6')",
                structure: "2d | 3d",
                showBonds: "boolean",
                showAngles: "boolean",
                atoms: "[{element, x, y}, ...]",
                bonds: "[{from, to, type: single|double|triple}, ...]",
                style: "ball_stick | space_filling | skeletal"
            },
            example: {
                op: "drawMolecule",
                formula: "H2O",
                structure: "2d",
                showBonds: true,
                showAngles: true,
                atoms: [
                    { element: "O", x: 0.5, y: 0.5 },
                    { element: "H", x: 0.4, y: 0.6 },
                    { element: "H", x: 0.6, y: 0.6 }
                ],
                bonds: [
                    { from: 0, to: 1, type: "single" },
                    { from: 0, to: 2, type: "single" }
                ]
            }
        },
        drawReaction: {
            description: "Draw chemical reaction with arrows",
            params: {
                reactants: "[molecule specs]",
                products: "[molecule specs]",
                reactionType: "synthesis | decomposition | combustion | redox",
                showEnergy: "boolean (activation energy diagram)",
                showMechanism: "boolean (electron movement)"
            }
        }
    },
    // ========================================================================
    // MATHEMATICS
    // ========================================================================
    mathematics: {
        drawGraph: {
            description: "Draw function graphs and plots",
            params: {
                type: "function | parametric | polar | implicit",
                function: "string (e.g., 'sin(x)', 'x^2')",
                xMin: "number",
                xMax: "number",
                yMin: "number",
                yMax: "number",
                showGrid: "boolean",
                showAxes: "boolean",
                gridColor: "string",
                lineColor: "string",
                lineWidth: "number",
                fillUnder: "boolean",
                label: "string"
            }
        },
        drawGeometry: {
            description: "Draw geometric shapes with measurements",
            params: {
                shape: "triangle | rectangle | circle | polygon | custom",
                vertices: "[[x,y], ...]",
                showAngles: "boolean",
                showSides: "boolean",
                showArea: "boolean",
                labels: "{angle: [...], side: [...]}",
                highlightProperties: "boolean"
            }
        },
        drawLatex: {
            description: "Render mathematical equations",
            params: {
                equation: "string (LaTeX format)",
                x: "number",
                y: "number",
                size: "number (font size)",
                color: "string",
                background: "string (optional)",
                align: "left | center | right"
            }
        },
        drawCoordinateSystem: {
            description: "Draw coordinate axes (2D or 3D)",
            params: {
                type: "cartesian | polar | cylindrical | spherical",
                dimensions: "2 | 3",
                xRange: "[min, max]",
                yRange: "[min, max]",
                zRange: "[min, max] (for 3D)",
                showGrid: "boolean",
                showLabels: "boolean",
                gridSpacing: "number"
            }
        }
    },
    // ========================================================================
    // COMPUTER SCIENCE
    // ========================================================================
    computerScience: {
        drawDataStructure: {
            description: "Draw data structures (arrays, trees, graphs)",
            params: {
                type: "array | linked_list | tree | graph | stack | queue | heap",
                data: "any[] (data to visualize)",
                showPointers: "boolean",
                showIndices: "boolean",
                highlightNodes: "number[] (indices to highlight)",
                layout: "horizontal | vertical | hierarchical"
            }
        },
        drawAlgorithmStep: {
            description: "Visualize algorithm execution step",
            params: {
                algorithm: "sort | search | traverse | dp",
                currentState: "object (state snapshot)",
                highlightElements: "number[]",
                showComparison: "boolean",
                showSwap: "boolean",
                stepDescription: "string"
            }
        },
        drawFlowchart: {
            description: "Draw flowchart or algorithm diagram",
            params: {
                nodes: "[{type: start|process|decision|end, label, id, x, y}]",
                connections: "[{from, to, label, condition}]",
                layout: "auto | manual"
            }
        },
        drawNeuralNetwork: {
            description: "Draw neural network architecture",
            params: {
                layers: "number[] (neurons per layer)",
                x: "number",
                y: "number",
                showWeights: "boolean",
                showActivation: "boolean",
                highlightPath: "boolean (forward pass)",
                layerLabels: "string[]"
            }
        }
    },
    // ========================================================================
    // GENERAL VISUALIZATION
    // ========================================================================
    general: {
        drawLabel: {
            description: "Draw text label with smart positioning",
            params: {
                text: "string",
                x: "number",
                y: "number",
                fontSize: "number",
                color: "string",
                background: "string (optional)",
                connectedTo: "{x, y} (draw line to this point)",
                avoidOverlap: "boolean (use layout engine)"
            }
        },
        drawDiagram: {
            description: "Draw custom diagram with nodes and edges",
            params: {
                nodes: "[{label, x, y, shape, color, size}]",
                edges: "[{from, to, label, style, arrow}]",
                layout: "force_directed | hierarchical | circular | manual"
            }
        },
        drawAnnotation: {
            description: "Draw explanatory annotation/callout",
            params: {
                text: "string",
                pointingTo: "{x, y}",
                position: "{x, y}",
                style: "box | cloud | arrow | line"
            }
        },
        animate: {
            description: "Animate any visual element",
            params: {
                objectId: "string (reference to object)",
                animation: "move | scale | rotate | fade | morph",
                from: "object (start state)",
                to: "object (end state)",
                duration: "number (ms)",
                easing: "linear | ease_in | ease_out | bounce"
            }
        },
        createSimulation: {
            description: "Create interactive simulation",
            params: {
                type: "physics | electrical | chemical | biological",
                objects: "[object specs]",
                rules: "object (simulation rules)",
                timeStep: "number (ms per step)",
                duration: "number (total duration)"
            }
        }
    }
};
exports.LAYOUT_STRATEGIES = {
    description: "Automatic layout algorithms to prevent overlap",
    textPlacement: {
        algorithm: "force_directed",
        description: "Uses repulsion forces to separate overlapping labels",
        constraints: ["min_distance", "stay_near_anchor", "within_bounds"]
    },
    componentPlacement: {
        algorithm: "grid_snap | hierarchical | circular",
        description: "Organizes components in clean layouts"
    },
    connectionRouting: {
        algorithm: "orthogonal | curved | direct",
        description: "Routes connections to avoid overlaps"
    }
};
exports.COMPOSITION_PATTERNS = {
    description: "Common patterns for composing multiple tools",
    inputOutputFlow: {
        pattern: "Show transformation from input to output",
        tools: ["drawSignalWaveform (input)", "drawCircuitElement (processor)", "drawConnection", "drawSignalWaveform (output)", "drawLatex (equation)"]
    },
    forceInteraction: {
        pattern: "Show forces between objects",
        tools: ["drawPhysicsObject", "drawPhysicsObject", "drawForceVector", "drawForceVector", "drawLatex (law)"]
    },
    structureFunctionRelation: {
        pattern: "Show structure and explain function",
        tools: ["drawCellStructure/Organ", "drawLabel (parts)", "drawAnnotation (functions)", "drawSimulation (process)"]
    },
    stepByStepProcess: {
        pattern: "Show sequential steps",
        tools: ["drawDiagram (initial)", "animate (transform)", "drawDiagram (intermediate)", "animate", "drawDiagram (final)"]
    }
};
function getToolDocumentation() {
    return `
# VISUAL TOOL LIBRARY DOCUMENTATION

You have access to a comprehensive set of visualization tools.
Your job is to SELECT and COMPOSE the most appropriate tools for any topic.

## TOOL CATEGORIES:
${Object.keys(exports.VISUAL_TOOL_LIBRARY).map(cat => `- ${cat}`).join('\n')}

## SELECTION PRINCIPLES:
1. Analyze what needs to be visualized
2. Select tools that best represent the concept
3. Compose multiple tools for complex visualizations
4. Use proper domain-specific tools (not generic shapes)
5. Apply layout strategies to prevent overlap

## QUALITY CRITERIA:
- Contextual accuracy (right symbols for the domain)
- Visual clarity (no overlapping text)
- Educational value (shows the concept clearly)
- Professional appearance (like 3Blue1Brown quality)

Full tool specifications available in VISUAL_TOOL_LIBRARY object.
`;
}
