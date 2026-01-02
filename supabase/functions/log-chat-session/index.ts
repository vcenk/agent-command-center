import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogRequest {
  agentId: string;
  sessionId: string;
  messages: { role: string; content: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, sessionId, messages } = (await req.json()) as LogRequest;

    if (!agentId || !sessionId || !messages) {
      return new Response(
        JSON.stringify({ error: "agentId, sessionId, and messages are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get agent to find workspace_id
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("id", agentId)
      .maybeSingle();

    if (agentError || !agent) {
      console.error("Error finding agent:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if session already exists
    const { data: existingSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("session_id", sessionId)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (sessionError) {
      console.error("Error checking session:", sessionError);
    }

    if (existingSession) {
      // Update existing session
      const { error: updateError } = await supabase
        .from("chat_sessions")
        .update({ messages })
        .eq("id", existingSession.id);

      if (updateError) {
        console.error("Error updating session:", updateError);
        throw updateError;
      }

      console.log(`Updated chat session: ${existingSession.id}`);
    } else {
      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from("chat_sessions")
        .insert({
          workspace_id: agent.workspace_id,
          agent_id: agentId,
          session_id: sessionId,
          messages,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating session:", createError);
        throw createError;
      }

      console.log(`Created chat session: ${newSession.id}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Log session error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
