/**
 * COMPREHENSIVE VISUAL TOOL LIBRARY
 *
 * This defines ALL visual primitives available for ANY topic.
 * Gemini selects and composes these tools dynamically based on content.
 */
export declare const VISUAL_TOOL_LIBRARY: {
    electrical: {
        drawCircuitElement: {
            description: string;
            params: {
                type: string;
                x: string;
                y: string;
                rotation: string;
                label: string;
                value: string;
            };
            example: {
                op: string;
                type: string;
                x: number;
                y: number;
                rotation: number;
                label: string;
                value: string;
            };
        };
        drawSignalWaveform: {
            description: string;
            params: {
                waveform: string;
                amplitude: string;
                frequency: string;
                phase: string;
                x: string;
                y: string;
                width: string;
                label: string;
                animate: string;
            };
            example: {
                op: string;
                waveform: string;
                amplitude: number;
                frequency: number;
                x: number;
                y: number;
                width: number;
                label: string;
                animate: boolean;
            };
        };
        drawConnection: {
            description: string;
            params: {
                from: string;
                to: string;
                waypoints: string;
                type: string;
                showArrow: string;
                label: string;
            };
        };
    };
    physics: {
        drawForceVector: {
            description: string;
            params: {
                x: string;
                y: string;
                dx: string;
                dy: string;
                magnitude: string;
                label: string;
                color: string;
                showMagnitude: string;
            };
            example: {
                op: string;
                x: number;
                y: number;
                dx: number;
                dy: number;
                magnitude: number;
                label: string;
                color: string;
                showMagnitude: boolean;
            };
        };
        drawPhysicsObject: {
            description: string;
            params: {
                shape: string;
                x: string;
                y: string;
                width: string;
                height: string;
                mass: string;
                velocity: string;
                label: string;
                color: string;
            };
        };
        drawTrajectory: {
            description: string;
            params: {
                path: string;
                showVelocity: string;
                showAcceleration: string;
                pathStyle: string;
                animate: string;
            };
        };
        drawFieldLines: {
            description: string;
            params: {
                type: string;
                sources: string;
                density: string;
                showArrows: string;
            };
        };
    };
    biology: {
        drawCellStructure: {
            description: string;
            params: {
                type: string;
                x: string;
                y: string;
                size: string;
                showOrganelles: string;
                organelles: string;
                detail: string;
                labels: string;
            };
            example: {
                op: string;
                type: string;
                x: number;
                y: number;
                size: number;
                showOrganelles: boolean;
                organelles: string[];
                detail: string;
                labels: boolean;
            };
        };
        drawOrganSystem: {
            description: string;
            params: {
                organ: string;
                style: string;
                showLabels: string;
                highlightParts: string;
                showFlow: string;
            };
        };
        drawMolecularStructure: {
            description: string;
            params: {
                type: string;
                structure: string;
                sequence: string;
                style: string;
                showBonds: string;
            };
        };
        drawMembrane: {
            description: string;
            params: {
                x: string;
                y: string;
                width: string;
                showProteins: string;
                showChannels: string;
                showTransport: string;
            };
        };
    };
    chemistry: {
        drawAtom: {
            description: string;
            params: {
                element: string;
                x: string;
                y: string;
                showElectrons: string;
                showNucleus: string;
                showOrbitals: string;
                label: string;
            };
        };
        drawMolecule: {
            description: string;
            params: {
                formula: string;
                structure: string;
                showBonds: string;
                showAngles: string;
                atoms: string;
                bonds: string;
                style: string;
            };
            example: {
                op: string;
                formula: string;
                structure: string;
                showBonds: boolean;
                showAngles: boolean;
                atoms: {
                    element: string;
                    x: number;
                    y: number;
                }[];
                bonds: {
                    from: number;
                    to: number;
                    type: string;
                }[];
            };
        };
        drawReaction: {
            description: string;
            params: {
                reactants: string;
                products: string;
                reactionType: string;
                showEnergy: string;
                showMechanism: string;
            };
        };
    };
    mathematics: {
        drawGraph: {
            description: string;
            params: {
                type: string;
                function: string;
                xMin: string;
                xMax: string;
                yMin: string;
                yMax: string;
                showGrid: string;
                showAxes: string;
                gridColor: string;
                lineColor: string;
                lineWidth: string;
                fillUnder: string;
                label: string;
            };
        };
        drawGeometry: {
            description: string;
            params: {
                shape: string;
                vertices: string;
                showAngles: string;
                showSides: string;
                showArea: string;
                labels: string;
                highlightProperties: string;
            };
        };
        drawLatex: {
            description: string;
            params: {
                equation: string;
                x: string;
                y: string;
                size: string;
                color: string;
                background: string;
                align: string;
            };
        };
        drawCoordinateSystem: {
            description: string;
            params: {
                type: string;
                dimensions: string;
                xRange: string;
                yRange: string;
                zRange: string;
                showGrid: string;
                showLabels: string;
                gridSpacing: string;
            };
        };
    };
    computerScience: {
        drawDataStructure: {
            description: string;
            params: {
                type: string;
                data: string;
                showPointers: string;
                showIndices: string;
                highlightNodes: string;
                layout: string;
            };
        };
        drawAlgorithmStep: {
            description: string;
            params: {
                algorithm: string;
                currentState: string;
                highlightElements: string;
                showComparison: string;
                showSwap: string;
                stepDescription: string;
            };
        };
        drawFlowchart: {
            description: string;
            params: {
                nodes: string;
                connections: string;
                layout: string;
            };
        };
        drawNeuralNetwork: {
            description: string;
            params: {
                layers: string;
                x: string;
                y: string;
                showWeights: string;
                showActivation: string;
                highlightPath: string;
                layerLabels: string;
            };
        };
    };
    general: {
        drawLabel: {
            description: string;
            params: {
                text: string;
                x: string;
                y: string;
                fontSize: string;
                color: string;
                background: string;
                connectedTo: string;
                avoidOverlap: string;
            };
        };
        drawDiagram: {
            description: string;
            params: {
                nodes: string;
                edges: string;
                layout: string;
            };
        };
        drawAnnotation: {
            description: string;
            params: {
                text: string;
                pointingTo: string;
                position: string;
                style: string;
            };
        };
        animate: {
            description: string;
            params: {
                objectId: string;
                animation: string;
                from: string;
                to: string;
                duration: string;
                easing: string;
            };
        };
        createSimulation: {
            description: string;
            params: {
                type: string;
                objects: string;
                rules: string;
                timeStep: string;
                duration: string;
            };
        };
    };
};
export declare const LAYOUT_STRATEGIES: {
    description: string;
    textPlacement: {
        algorithm: string;
        description: string;
        constraints: string[];
    };
    componentPlacement: {
        algorithm: string;
        description: string;
    };
    connectionRouting: {
        algorithm: string;
        description: string;
    };
};
export declare const COMPOSITION_PATTERNS: {
    description: string;
    inputOutputFlow: {
        pattern: string;
        tools: string[];
    };
    forceInteraction: {
        pattern: string;
        tools: string[];
    };
    structureFunctionRelation: {
        pattern: string;
        tools: string[];
    };
    stepByStepProcess: {
        pattern: string;
        tools: string[];
    };
};
export declare function getToolDocumentation(): string;
//# sourceMappingURL=visualTools.d.ts.map