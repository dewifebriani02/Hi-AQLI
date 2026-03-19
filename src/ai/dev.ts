import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import '@/ai/flows/ai-scholar-question.ts';
import '@/ai/flows/ai-tilawah-assistant.ts';
import '@/ai/flows/verse-analysis.ts';
