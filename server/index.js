import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import { z } from 'zod'

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Always load env relative to this file so running from repo root still works.
// Prefer `.env.local` for secrets, but support `.env` too.
for (const filename of ['.env.local', '.env']) {
  const envPath = path.join(__dirname, filename)
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  }),
)

app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const MealAnalysisSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fats: z.number().nonnegative(),
  healthScore: z.number().min(0).max(100),
  suggestions: z.array(z.string()).default([]),
})

const AnalyzeRequestSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  imageDataUrl: z.string().trim().optional(),
})

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, value: null }
  }
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = text.slice(start, end + 1)
  const parsed = safeJsonParse(candidate)
  return parsed.ok ? parsed.value : null
}

app.post('/api/analyze', async (req, res) => {
  const parsedReq = AnalyzeRequestSchema.safeParse(req.body)
  if (!parsedReq.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: parsedReq.error.flatten(),
    })
  }

  const { description, imageDataUrl } = parsedReq.data

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server is missing OPENAI_API_KEY' })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

  const system =
    'You are a nutrition analysis assistant. Return ONLY valid JSON (no markdown, no code fences). ' +
    'Estimate macros and calories for the described meal. healthScore is 0-100. suggestions is an array of healthier alternatives.'

  const user = {
    description,
    imageProvided: Boolean(imageDataUrl),
    note:
      'If an image is provided, treat it as optional context; do not claim to see details you cannot infer. Prefer conservative estimates.',
    outputSchema: {
      calories: 'number',
      protein: 'number',
      carbs: 'number',
      fats: 'number',
      healthScore: 'number 0-100',
      suggestions: 'string[]',
    },
  }

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify(user),
        },
      ],
    })

    const content = response.choices?.[0]?.message?.content || ''
    const obj = safeJsonParse(content).ok ? JSON.parse(content) : extractFirstJsonObject(content)

    const validated = MealAnalysisSchema.safeParse(obj)
    if (!validated.success) {
      return res.status(502).json({
        error: 'AI returned invalid JSON shape',
        raw: content,
      })
    }

    return res.json(validated.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: 'Analyze failed', message })
  }
})

const port = Number(process.env.PORT || 5174)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`NutriLens server listening on http://localhost:${port}`)
})
