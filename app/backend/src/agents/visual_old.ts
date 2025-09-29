import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, PlanStep } from '../types';
import { logger } from '../logger';

const MODEL = 'gemini-2.5-flash';
const TIMEOUT = 8000; // 8 seconds for production reliability
const BATCH_SIZE = 2; // Generate 2 visuals at a time
const MAX_RETRIES = 2; // Quick retries

export interface VisualChunk {
  type: 'visuals';
  stepId: number;
  actions: Action[];
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]) as Promise<T>;
}

// REVOLUTIONARY APPROACH: Simple text parsing instead of complex JSON
export async function visualAgent(
  step: PlanStep,
  topic: string
): Promise<VisualChunk | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  
  // Ultra-simplified prompt for FAST generation
  const prompt = `Generate 5 visual commands for "${topic}" step ${step.id}:

circle [x] [y] [radius] [color]
vector [x1] [y1] [x2] [y2] [color]
orbit [centerX] [centerY] [radius] [period] [color]
particle [x] [y] [spread] [speed] [color]
wave [startX] [startY] [amplitude] [frequency] [color]

Replace brackets with numbers (0-1 range) and hex colors.
Output ONLY 5 lines starting with command names:`;

  try {
    const res = await withTimeout(model.generateContent(prompt), TIMEOUT);
    let text = res.response.text().trim();
    
    // Parse simple line format
    const lines = text.split('\n').filter(line => line.trim());
    const actions: Action[] = [];
    
    for (const line of lines.slice(0, 5)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;
      
      const cmd = parts[0].toLowerCase();
      
      // Parse each command type
      if (cmd === 'circle' && parts.length >= 5) {
        actions.push({
          op: 'drawCircle',
          x: parseFloat(parts[1]) || 0.5,
          y: parseFloat(parts[2]) || 0.5,
          radius: parseFloat(parts[3]) || 0.1,
          color: parts[4] || '#3498db',
          fill: true,
          normalized: true
        });
      } else if (cmd === 'vector' && parts.length >= 6) {
        actions.push({
          op: 'drawVector',
          x1: parseFloat(parts[1]) || 0.3,
          y1: parseFloat(parts[2]) || 0.3,
          x2: parseFloat(parts[3]) || 0.7,
          y2: parseFloat(parts[4]) || 0.7,
          color: parts[5] || '#e74c3c',
          normalized: true
        });
      } else if (cmd === 'orbit' && parts.length >= 6) {
        actions.push({
          op: 'orbit',
          centerX: parseFloat(parts[1]) || 0.5,
          centerY: parseFloat(parts[2]) || 0.5,
          radius: parseFloat(parts[3]) || 0.2,
          period: parseFloat(parts[4]) || 2,
          objectRadius: 0.02,
          color: parts[5] || '#2ecc71',
          trail: true
        });
      } else if (cmd === 'particle' && parts.length >= 6) {
        actions.push({
          op: 'particle',
          x: parseFloat(parts[1]) || 0.5,
          y: parseFloat(parts[2]) || 0.5,
          count: 5,
          spread: parseFloat(parts[3]) || 0.2,
          speed: parseFloat(parts[4]) || 0.5,
          lifetime: 2,
          color: parts[5] || '#f39c12'
        });
      } else if (cmd === 'wave' && parts.length >= 6) {
        actions.push({
          op: 'wave',
          startX: parseFloat(parts[1]) || 0.1,
          startY: parseFloat(parts[2]) || 0.5,
          width: 0.8,
          amplitude: parseFloat(parts[3]) || 0.1,
          frequency: parseFloat(parts[4]) || 2,
          speed: 1,
          color: parts[5] || '#9b59b6'
        });
      }
    }
    
    // If parsing failed, generate basic visuals dynamically based on step
    if (actions.length < 2) {
      // Generate contextual visuals based on step type
      const baseX = 0.3 + (step.id * 0.1) % 0.4;
      const baseY = 0.3 + (step.id * 0.15) % 0.4;
      
      actions.push({
        op: 'drawCircle',
        x: baseX,
        y: baseY,
        radius: 0.1 + (step.id * 0.02),
        color: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'][step.id % 5],
        fill: true,
        normalized: true
      });
      
      actions.push({
        op: 'drawVector',
        x1: baseX,
        y1: baseY,
        x2: baseX + 0.3,
        y2: baseY + 0.2,
        color: '#e74c3c',
        normalized: true
      });
      
      if (step.id % 2 === 0) {
        actions.push({
          op: 'orbit',
          centerX: 0.5,
          centerY: 0.5,
          radius: 0.15,
          period: 3,
          objectRadius: 0.02,
          color: '#2ecc71',
          trail: true
        });
  
  return actions;
}
