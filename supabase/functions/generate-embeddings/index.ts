import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  authenticateRequest,
  hasMinRole,
  getAdminClient,
} from '../_shared/auth.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

interface EmbeddingRequest {
  sourceId: string
  regenerate?: boolean
}

/**
 * Generate embedding for a single text using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Generate embeddings for all chunks of a knowledge source
 */
async function processKnowledgeSource(
  supabase: ReturnType<typeof createClient>,
  sourceId: string,
  regenerate: boolean = false
): Promise<{ processed: number; skipped: number; errors: string[] }> {
  const result = { processed: 0, skipped: 0, errors: [] as string[] }

  // Get all chunks for this source
  let query = supabase
    .from('knowledge_chunks')
    .select('id, content, embedding')
    .eq('source_id', sourceId)
    .order('chunk_index')

  // If not regenerating, only get chunks without embeddings
  if (!regenerate) {
    query = query.is('embedding', null)
  }

  const { data: chunks, error: chunksError } = await query

  if (chunksError) {
    result.errors.push(`Failed to load chunks: ${chunksError.message}`)
    return result
  }

  if (!chunks || chunks.length === 0) {
    return result
  }

  console.log(`Processing ${chunks.length} chunks for source ${sourceId}`)

  // Process chunks in batches to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    // Process batch in parallel
    const promises = batch.map(async (chunk) => {
      // Skip if already has embedding and not regenerating
      if (chunk.embedding && !regenerate) {
        result.skipped++
        return
      }

      try {
        const embedding = await generateEmbedding(chunk.content)

        // Update chunk with embedding
        const { error: updateError } = await supabase
          .from('knowledge_chunks')
          .update({
            embedding: embedding,
            embedding_model: EMBEDDING_MODEL,
          })
          .eq('id', chunk.id)

        if (updateError) {
          result.errors.push(`Failed to update chunk ${chunk.id}: ${updateError.message}`)
        } else {
          result.processed++
        }
      } catch (err) {
        result.errors.push(`Failed to embed chunk ${chunk.id}: ${err.message}`)
      }
    })

    await Promise.all(promises)

    // Small delay between batches to respect rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return result
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for API key
    if (!OPENAI_API_KEY) {
      return errorResponse('OpenAI API key not configured', 500)
    }

    // Authenticate the request
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) {
      return auth
    }

    // Require at least MANAGER role
    if (!hasMinRole(auth.role, 'MANAGER')) {
      return errorResponse('Insufficient permissions', 403)
    }

    if (!auth.workspaceId) {
      return errorResponse('No workspace found', 400)
    }

    // Parse request body
    const { sourceId, regenerate = false }: EmbeddingRequest = await req.json()

    if (!sourceId) {
      return errorResponse('sourceId is required', 400)
    }

    // Use admin client to bypass RLS
    const supabase = getAdminClient()

    // Verify the source belongs to this workspace
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .select('id, workspace_id, name')
      .eq('id', sourceId)
      .single()

    if (sourceError || !source) {
      return errorResponse('Knowledge source not found', 404)
    }

    if (source.workspace_id !== auth.workspaceId) {
      return errorResponse('Access denied', 403)
    }

    // Process the knowledge source
    console.log(`Generating embeddings for source: ${source.name} (${sourceId})`)
    const result = await processKnowledgeSource(supabase, sourceId, regenerate)

    return jsonResponse({
      success: true,
      sourceId,
      sourceName: source.name,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })

  } catch (err) {
    console.error('Generate embeddings error:', err)
    return errorResponse(err.message || 'Internal server error', 500)
  }
})
