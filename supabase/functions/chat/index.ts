import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  agentId: string;
  messages: ChatMessage[];
  sessionId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, messages, sessionId } = (await req.json()) as ChatRequest;

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for backend access
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Load agent data
    console.log(`Loading agent: ${agentId}`);
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .maybeSingle();

    if (agentError) {
      console.error("Error loading agent:", agentError);
    }

    // Load persona if agent has one
    let persona = null;
    if (agent?.persona_id) {
      console.log(`Loading persona: ${agent.persona_id}`);
      const { data: personaData, error: personaError } = await supabase
        .from("personas")
        .select("*")
        .eq("id", agent.persona_id)
        .maybeSingle();

      if (personaError) {
        console.error("Error loading persona:", personaError);
      } else {
        persona = personaData;
      }
    }

    // Load knowledge base content if agent has knowledge sources
    let knowledgeContext = "";
    if (agent?.knowledge_source_ids && agent.knowledge_source_ids.length > 0) {
      console.log(`Loading knowledge from ${agent.knowledge_source_ids.length} sources`);
      
      // Get the latest user message for retrieval
      const latestUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
      
      // Simple keyword-based retrieval from chunks
      const { data: chunks, error: chunksError } = await supabase
        .from("knowledge_chunks")
        .select("content, source_id")
        .in("source_id", agent.knowledge_source_ids)
        .limit(5);

      if (chunksError) {
        console.error("Error loading knowledge chunks:", chunksError);
      } else if (chunks && chunks.length > 0) {
        // Simple scoring based on keyword matching
        const queryWords = latestUserMessage.toLowerCase().split(/\s+/);
        const scoredChunks = chunks.map(chunk => {
          const chunkLower = chunk.content.toLowerCase();
          let score = 0;
          for (const word of queryWords) {
            if (word.length > 2 && chunkLower.includes(word)) {
              score++;
            }
          }
          return { ...chunk, score };
        }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

        if (scoredChunks.length > 0) {
          knowledgeContext = "\n\n## Relevant Knowledge:\n" + 
            scoredChunks.map(c => c.content).join("\n---\n");
        }
      }
    }

    // Build system prompt based on agent and persona
    let systemPrompt = "You are a helpful AI assistant.";

    if (agent) {
      systemPrompt = `You are an AI assistant for ${agent.name}.`;
      
      if (agent.goals) {
        systemPrompt += `\n\nYour goals: ${agent.goals}`;
      }

      if (agent.business_domain && agent.business_domain !== "other") {
        systemPrompt += `\n\nYou specialize in ${agent.business_domain}.`;
      }
    }

    if (persona) {
      systemPrompt = `You are ${persona.name}, ${persona.role_title}.`;
      
      // Tone
      const toneInstructions: Record<string, string> = {
        professional: "Maintain a professional and courteous tone in all interactions.",
        friendly: "Be warm, friendly, and approachable in your responses.",
        casual: "Keep your responses casual and conversational.",
        formal: "Use formal language and maintain proper etiquette.",
      };
      systemPrompt += `\n\n${toneInstructions[persona.tone] || toneInstructions.professional}`;

      // Style notes
      if (persona.style_notes) {
        systemPrompt += `\n\nStyle guidelines: ${persona.style_notes}`;
      }

      // Greeting script
      if (persona.greeting_script) {
        systemPrompt += `\n\nWhen greeting users, use: "${persona.greeting_script}"`;
      }

      // Do not do restrictions
      if (persona.do_not_do && persona.do_not_do.length > 0) {
        systemPrompt += `\n\nRestrictions - Do NOT:\n- ${persona.do_not_do.join("\n- ")}`;
      }

      // Fallback policy
      const fallbackPolicies: Record<string, string> = {
        apologize: "If you don't know something, apologize politely and offer to help in another way.",
        escalate: "If you cannot help with a request, let the user know you'll escalate to a human agent.",
        retry: "If you don't understand, ask clarifying questions to better assist the user.",
        transfer: "If the request is beyond your capabilities, offer to transfer to a human representative.",
      };
      systemPrompt += `\n\n${fallbackPolicies[persona.fallback_policy] || fallbackPolicies.apologize}`;

      // Escalation rules
      if (persona.escalation_rules) {
        systemPrompt += `\n\nEscalation rules: ${persona.escalation_rules}`;
      }
    }

    // Add knowledge context
    if (knowledgeContext) {
      systemPrompt += knowledgeContext;
      systemPrompt += "\n\nUse the above knowledge to answer user questions when relevant.";
    }

    console.log(`System prompt built (${systemPrompt.length} chars), sending to AI`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
