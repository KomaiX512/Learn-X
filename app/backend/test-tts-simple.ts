import * as dotenv from 'dotenv';
dotenv.config();

console.log('TTS_ENABLED:', process.env.TTS_ENABLED);
console.log('TTS_API_KEY:', process.env.GOOGLE_CLOUD_TTS_API_KEY ? '***SET***' : 'NOT SET');
console.log('TTS_API_KEY length:', process.env.GOOGLE_CLOUD_TTS_API_KEY?.length || 0);

import { ttsService } from './src/services/tts-service';

console.log('Service available:', ttsService.isAvailable());
