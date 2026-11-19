import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const COACH_SYSTEM_INSTRUCTION = `You are SportIQ AI, an intelligent sports biomechanics and athletic performance coach.
Your role is to analyze completed workout telemetry (repetitions, incomplete reps, joint angles, posture alignment scores, duration, and frequency), summarize performance clearly, suggest practical technique improvements, recommend appropriate rest and recovery days, and build structured beginner, intermediate, or advanced training plans for squats, push-ups, and lunges.

Safety and Scope Rules:
1. NEVER provide medical diagnoses, injury diagnoses, rehabilitation prescriptions, or claim that pose tracking can detect injuries. If a user asks about pain or injury, advise them to consult a qualified healthcare professional or physical therapist.
2. Keep recommendations safe, progressive, and tailored to the user's stated fitness level and weekly target.
3. Ground every analysis in the actual workout statistics provided in the context. Do not invent workout sessions that are not in the user's data.
4. Keep responses concise, structured, encouraging, and directly actionable.`;

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const ai = getGeminiClient();
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(ai),
    });
  });

  app.post('/api/coach/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: 'GEMINI_NOT_CONFIGURED',
        error:
          'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable live AI coaching.',
      });
      return;
    }

    try {
      const { message, history = [], userProfile, workoutStats, recentWorkouts = [] } = req.body ?? {};
      if (typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ code: 'INVALID_REQUEST', error: 'Message is required.' });
        return;
      }

      const contextSummary = JSON.stringify({
        athleteProfile: userProfile ?? null,
        aggregateStats: workoutStats ?? null,
        recentWorkouts: Array.isArray(recentWorkouts) ? recentWorkouts.slice(0, 8) : [],
      });

      const conversationHistory = Array.isArray(history)
        ? history.slice(-10).map((item: { role?: string; content?: string }) => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(item.content ?? '') }],
          }))
        : [];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          ...conversationHistory,
          {
            role: 'user',
            parts: [
              {
                text: `Athlete Telemetry Context:\n${contextSummary}\n\nAthlete Question:\n${message.trim()}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: COACH_SYSTEM_INSTRUCTION,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({
          code: 'EMPTY_RESPONSE',
          error: 'Gemini returned an empty response. Please try again.',
        });
        return;
      }

      res.json({ reply });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to generate AI coaching response.';
      const status = errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED') ? 403 : 500;
      res.status(status).json({
        code: 'GEMINI_ERROR',
        error: errMsg,
      });
    }
  });

  app.post('/api/coach/insights', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: 'GEMINI_NOT_CONFIGURED',
        error:
          'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable AI performance insights.',
      });
      return;
    }

    try {
      const { session, userProfile, recentWorkouts = [] } = req.body ?? {};
      const prompt = session
        ? `Analyze this newly completed workout session and provide structured coaching insights:\nSession: ${JSON.stringify(
            session
          )}\nAthlete Profile: ${JSON.stringify(userProfile ?? {})}\nRecent History: ${JSON.stringify(
            Array.isArray(recentWorkouts) ? recentWorkouts.slice(0, 5) : []
          )}`
        : `Analyze the athlete's recent workout history and provide an overall training performance review:\nAthlete Profile: ${JSON.stringify(
            userProfile ?? {}
          )}\nRecent Workouts: ${JSON.stringify(Array.isArray(recentWorkouts) ? recentWorkouts.slice(0, 10) : [])}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: COACH_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Concise 2-3 sentence performance summary grounded in the telemetry numbers.',
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific strengths observed from rep completion, confidence, and alignment.',
              },
              improvements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 actionable biomechanical or pacing improvements.',
              },
              nextSessionPlan: {
                type: Type.STRING,
                description: 'Specific achievable target sets, reps, and focus cue for the next session.',
              },
              recoveryNote: {
                type: Type.STRING,
                description: 'Practical rest, hydration, or recovery day recommendation without medical claims.',
              },
            },
            required: ['summary', 'strengths', 'improvements', 'nextSessionPlan', 'recoveryNote'],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      res.json({ insights: parsed });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to analyze workout performance.';
      res.status(500).json({
        code: 'GEMINI_ERROR',
        error: errMsg,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SportIQ AI server listening on http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start SportIQ AI server:', err);
  process.exit(1);
});
