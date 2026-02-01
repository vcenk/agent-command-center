import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: "agentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch widget config for the agent
    const { data: config, error } = await supabase
      .from("agent_web_widget_config")
      .select("enabled, allowed_domains, position, launcher_label, primary_color")
      .eq("agent_id", agentId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching widget config:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no config exists, return defaults but not enabled
    if (!config) {
      return new Response(
        JSON.stringify({
          enabled: false,
          allowed_domains: [],
          position: "bottom-right",
          launcher_label: "Chat with us",
          primary_color: "#111827",
          // Include API config for widget initialization
          apiConfig: {
            supabaseUrl: SUPABASE_URL,
            anonKey: SUPABASE_ANON_KEY,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if agent is live
    const { data: agent } = await supabase
      .from("agents")
      .select("status")
      .eq("id", agentId)
      .maybeSingle();

    // Only enabled if config is enabled AND agent is live
    const enabled = config.enabled && agent?.status === "live";

    return new Response(
      JSON.stringify({
        enabled,
        allowed_domains: config.allowed_domains || [],
        position: config.position,
        launcher_label: config.launcher_label,
        primary_color: config.primary_color,
        // Include API config for widget initialization
        apiConfig: {
          supabaseUrl: SUPABASE_URL,
          anonKey: SUPABASE_ANON_KEY,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Widget config error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
