import OpenAI from 'openai'
import { z } from 'zod'

const MAX_BODY_BYTES = 2 * 1024 * 1024

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

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim()) {
    const parsed = safeJsonParse(req.body)
    if (parsed.ok) return parsed.value
  }

  // In some serverless environments the request stream may already be consumed.
  // If it has already ended and no parsed body is available, treat it as empty.
  if (req.readableEnded || req.complete) return null

  const chunks = []
  let total = 0

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out reading request body'))
      try {
        req.destroy()
      } catch {
        // ignore
      }
    }, 5000)

    const cleanup = () => clearTimeout(timeout)

    req.on('aborted', () => {
      cleanup()
      reject(new Error('Request aborted'))
    })

    req.on('data', (chunk) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        cleanup()
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      cleanup()
      resolve()
    })

    req.on('error', (err) => {
      cleanup()
      reject(err)
    })
  })

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return null

  const parsed = safeJsonParse(raw)
  return parsed.ok ? parsed.value : null
}

export default async function handler(req, res) {
  // Same-origin in production, but keep minimal CORS handling for safety.
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body = null
  try {
    body = await readJsonBody(req)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request body'
    const status = message.includes('too large') ? 413 : 400
    return res.status(status).json({ error: message })
  }
  const parsedReq = AnalyzeRequestSchema.safeParse(body)
  if (!parsedReq.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: parsedReq.error.flatten(),
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server is missing OPENAI_API_KEY' })
  }

  const { description, imageDataUrl } = parsedReq.data

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
        { role: 'user', content: JSON.stringify(user) },
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
}
