import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

// 1. Define BOTH Environment Bindings and Context Variables
type Env = {
  Bindings: {
    DATABASE_URL: string
  }
  Variables: {
    prisma: PrismaClient
  }
}

// Pass the full Env type to Hono
const app = new Hono<Env>()

// 2. Per-Request Prisma Client Lifecycle Middleware
app.use('*', async (c, next) => {
  // Pass the Cloudflare environment variable DIRECTLY to the adapter
  const adapter = new PrismaNeon({ connectionString: c.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })
  
  // Attach the client strictly typed
  c.set('prisma', prisma)
  
  await next()
  
  await prisma.$disconnect()
})

// 3. Define Zod Schema for input validation
const paperIngestSchema = z.object({
  schemaVersion: z.string(),
  recordType: z.literal("RESEARCH_PAPER"),
  content: z.object({
    title: z.string(),
    paper_url: z.string().url().optional(),
    github_url: z.string().url().optional(),
    github_stars: z.number().default(0)
  })
})

// 4. High-Concurrency Node Ingestion Endpoint
app.post('/api/v1/ingest/research-paper', zValidator('json', paperIngestSchema), async (c) => {
  // Use c.var.prisma to access your database safely without "as any"
  const prisma = c.var.prisma
  const body = c.req.valid('json')
  
  // Generate a URL safe slug
  const safeTitle = body.content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${safeTitle.substring(0, 50)}-${Math.random().toString(36).substring(2, 10)}`

  try {
    const newPaper = await prisma.paper.create({
      data: {
        slug: slug,
        title: body.content.title,
        paperUrl: body.content.paper_url,
        projectUrl: body.content.github_url,
        citationCount: body.content.github_stars
      }
    })

    return c.json({
      status: "success",
      message: "Paper successfully written via Prisma Neon Adapter",
      paper_id: newPaper.id,
      slug: newPaper.slug
    }, 201)
  } catch (error: any) {
    return c.json({ status: "error", detail: error.message }, 500)
  }
})

export default app