export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_web_widget_config: {
        Row: {
          agent_id: string
          allowed_domains: string[]
          created_at: string
          enabled: boolean
          id: string
          launcher_label: string
          position: string
          primary_color: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          allowed_domains?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          launcher_label?: string
          position?: string
          primary_color?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          allowed_domains?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          launcher_label?: string
          position?: string
          primary_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_web_widget_config_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          allowed_actions: string[] | null
          business_domain: Database["public"]["Enums"]["business_domain"]
          channels: Json
          created_at: string
          goals: string | null
          id: string
          knowledge_source_ids: string[] | null
          name: string
          persona_id: string | null
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          workspace_id: string
          llm_model_id: string | null
          llm_temperature: number | null
          llm_max_tokens: number | null
        }
        Insert: {
          allowed_actions?: string[] | null
          business_domain?: Database["public"]["Enums"]["business_domain"]
          channels?: Json
          created_at?: string
          goals?: string | null
          id?: string
          knowledge_source_ids?: string[] | null
          name: string
          persona_id?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          workspace_id: string
          llm_model_id?: string | null
          llm_temperature?: number | null
          llm_max_tokens?: number | null
        }
        Update: {
          allowed_actions?: string[] | null
          business_domain?: Database["public"]["Enums"]["business_domain"]
          channels?: Json
          created_at?: string
          goals?: string | null
          id?: string
          knowledge_source_ids?: string[] | null
          name?: string
          persona_id?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          workspace_id?: string
          llm_model_id?: string | null
          llm_temperature?: number | null
          llm_max_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_configs: {
        Row: {
          agent_id: string
          business_hours: string | null
          channel: string
          created_at: string
          escalation_to_human: boolean | null
          greeting: string | null
          id: string
          phone_number: string | null
          provider: string | null
          updated_at: string
          voicemail_fallback: boolean | null
        }
        Insert: {
          agent_id: string
          business_hours?: string | null
          channel: string
          created_at?: string
          escalation_to_human?: boolean | null
          greeting?: string | null
          id?: string
          phone_number?: string | null
          provider?: string | null
          updated_at?: string
          voicemail_fallback?: boolean | null
        }
        Update: {
          agent_id?: string
          business_hours?: string | null
          channel?: string
          created_at?: string
          escalation_to_human?: boolean | null
          greeting?: string | null
          id?: string
          phone_number?: string | null
          provider?: string | null
          updated_at?: string
          voicemail_fallback?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          agent_id: string
          channel: string | null
          created_at: string
          ended_at: string | null
          id: string
          internal_note: string | null
          last_message: string | null
          last_message_at: string | null
          lead_captured: boolean | null
          lead_id: string | null
          messages: Json
          session_id: string
          started_at: string
          status: string
          summary: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_id: string
          channel?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          internal_note?: string | null
          last_message?: string | null
          last_message_at?: string | null
          lead_captured?: boolean | null
          lead_id?: string | null
          messages?: Json
          session_id: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string
          channel?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          internal_note?: string | null
          last_message?: string | null
          last_message_at?: string | null
          lead_captured?: boolean | null
          lead_id?: string | null
          messages?: Json
          session_id?: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          id: string
          source_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          id?: string
          source_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          name: string
          raw_text: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["knowledge_type"]
          updated_at: string
          url: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          name: string
          raw_text?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["knowledge_type"]
          updated_at?: string
          url?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          name?: string
          raw_text?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["knowledge_type"]
          updated_at?: string
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string
          channel: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          session_id: string | null
          source: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_id: string
          channel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          session_id?: string | null
          source?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string
          channel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          session_id?: string | null
          source?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          created_at: string
          do_not_do: string[] | null
          escalation_rules: string | null
          fallback_policy: Database["public"]["Enums"]["fallback_policy"]
          greeting_script: string | null
          id: string
          name: string
          role_title: string
          style_notes: string | null
          tone: Database["public"]["Enums"]["persona_tone"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          do_not_do?: string[] | null
          escalation_rules?: string | null
          fallback_policy?: Database["public"]["Enums"]["fallback_policy"]
          greeting_script?: string | null
          id?: string
          name: string
          role_title: string
          style_notes?: string | null
          tone?: Database["public"]["Enums"]["persona_tone"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          do_not_do?: string[] | null
          escalation_rules?: string | null
          fallback_policy?: Database["public"]["Enums"]["fallback_policy"]
          greeting_script?: string | null
          id?: string
          name?: string
          role_title?: string
          style_notes?: string | null
          tone?: Database["public"]["Enums"]["persona_tone"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_models: {
        Row: {
          id: string
          provider: Database["public"]["Enums"]["llm_provider"]
          model_id: string
          display_name: string
          description: string | null
          context_window: number
          max_output_tokens: number
          supports_vision: boolean
          supports_function_calling: boolean
          cost_per_1k_input: number | null
          cost_per_1k_output: number | null
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: Database["public"]["Enums"]["llm_provider"]
          model_id: string
          display_name: string
          description?: string | null
          context_window?: number
          max_output_tokens?: number
          supports_vision?: boolean
          supports_function_calling?: boolean
          cost_per_1k_input?: number | null
          cost_per_1k_output?: number | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: Database["public"]["Enums"]["llm_provider"]
          model_id?: string
          display_name?: string
          description?: string | null
          context_window?: number
          max_output_tokens?: number
          supports_vision?: boolean
          supports_function_calling?: boolean
          cost_per_1k_input?: number | null
          cost_per_1k_output?: number | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_llm_config: {
        Row: {
          id: string
          workspace_id: string
          provider: Database["public"]["Enums"]["llm_provider"]
          api_key_encrypted: string | null
          base_url: string | null
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          provider: Database["public"]["Enums"]["llm_provider"]
          api_key_encrypted?: string | null
          base_url?: string | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          provider?: Database["public"]["Enums"]["llm_provider"]
          api_key_encrypted?: string | null
          base_url?: string | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_llm_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      user_has_workspace_access: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_status: "draft" | "live"
      app_role: "OWNER" | "MANAGER" | "VIEWER"
      business_domain:
        | "healthcare"
        | "retail"
        | "finance"
        | "realestate"
        | "hospitality"
        | "other"
      fallback_policy: "apologize" | "escalate" | "retry" | "transfer"
      knowledge_type: "PDF" | "URL" | "TEXT"
      persona_tone: "professional" | "friendly" | "casual" | "formal"
      llm_provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "together" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_status: ["draft", "live"],
      app_role: ["OWNER", "MANAGER", "VIEWER"],
      business_domain: [
        "healthcare",
        "retail",
        "finance",
        "realestate",
        "hospitality",
        "other",
      ],
      fallback_policy: ["apologize", "escalate", "retry", "transfer"],
      knowledge_type: ["PDF", "URL", "TEXT"],
      persona_tone: ["professional", "friendly", "casual", "formal"],
      llm_provider: ["openai", "anthropic", "google", "mistral", "groq", "together", "custom"],
    },
  },
} as const
