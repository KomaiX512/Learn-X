/**
 * Audio-Narration Service
 * Combines narration generation with TTS to produce audio files
 */
import { StepNarration, NarrationOutput } from '../agents/narrationGenerator';
import { PlanStep } from '../types';
export interface AudioNarration extends NarrationOutput {
    audioUrl?: string;
    audioBase64?: string;
    audioSize?: number;
}
export interface StepAudioNarration extends StepNarration {
    narrations: AudioNarration[];
    hasAudio: boolean;
    totalAudioSize: number;
}
export interface VisualInput {
    type: 'notes' | 'animation';
    visualNumber: number;
    svgCode?: string;
    actionCount?: number;
    description?: string;
}
/**
 * Generate narrations with audio for a complete step
 */
export declare function generateStepNarrationWithAudio(step: PlanStep, topic: string, visuals: VisualInput[], sessionId: string): Promise<StepAudioNarration>;
/**
 * Get the inter-visual delay (time to wait between visuals)
 */
export declare function getInterVisualDelay(): number;
/**
 * Check if audio narration is available
 */
export declare function isAudioNarrationAvailable(): boolean;
//# sourceMappingURL=audio-narration-service.d.ts.map