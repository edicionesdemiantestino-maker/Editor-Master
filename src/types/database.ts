// ============================================================
// Database types — Editor Maestro
// Basado en el schema real de Supabase
// Actualizar cuando cambien las tablas
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          data: Json;
          workspace_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: Json;
          workspace_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data?: Json;
          workspace_id?: string | null;
          created_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_id: string | null;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          price_id: string | null;
          metered_item_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          price_id?: string | null;
          metered_item_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          price_id?: string | null;
          metered_item_id?: string | null;
          updated_at?: string | null;
        };
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          job_id: string | null;
          cost_units: number;
          cost_usd: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          job_id?: string | null;
          cost_units?: number;
          cost_usd?: number | null;
          created_at?: string;
        };
        Update: {
          cost_units?: number;
          cost_usd?: number | null;
        };
      };
      user_credits: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          updated_at?: string;
        };
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string | null;
          ref: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason?: string | null;
          ref?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      brand_kits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          data: Json;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          data: Json;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          data?: Json;
          updated_at?: string | null;
        };
      };
      templates: {
        Row: {
          id: string;
          name: string;
          category: string;
          preview_url: string | null;
          data: Json;
          is_featured: boolean;
          is_premium: boolean;
          price: number;
          creator_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          preview_url?: string | null;
          data: Json;
          is_featured?: boolean;
          is_premium?: boolean;
          price?: number;
          creator_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          preview_url?: string | null;
          data?: Json;
          is_featured?: boolean;
          is_premium?: boolean;
          price?: number;
        };
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          status: string;
          event_type: string | null;
          error_message: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          status?: string;
          event_type?: string | null;
          error_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          error_message?: string | null;
          processed_at?: string | null;
        };
      };
      plans: {
        Row: {
          id: string;
          name: string;
          monthly_credits: number;
          max_projects: number;
          max_brand_kits: number;
          features: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          monthly_credits?: number;
          max_projects?: number;
          max_brand_kits?: number;
          features?: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          monthly_credits?: number;
          max_projects?: number;
          max_brand_kits?: number;
          features?: Json;
        };
      };
      user_quotas_daily: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          usage_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          usage_count?: number;
          updated_at?: string;
        };
        Update: {
          usage_count?: number;
          updated_at?: string;
        };
      };
      billing_settings: {
        Row: {
          id: string;
          user_id: string;
          auto_topup_enabled: boolean;
          topup_threshold: number;
          topup_amount: number;
          default_payment_method: string | null;
          last_auto_topup_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          auto_topup_enabled?: boolean;
          topup_threshold?: number;
          topup_amount?: number;
          default_payment_method?: string | null;
          last_auto_topup_at?: string | null;
          created_at?: string;
        };
        Update: {
          auto_topup_enabled?: boolean;
          topup_threshold?: number;
          topup_amount?: number;
          default_payment_method?: string | null;
          last_auto_topup_at?: string | null;
        };
      };
    };
    Functions: {
      add_credits: {
        Args: { p_user_id: string; p_amount: number; p_ref?: string };
        Returns: void;
      };
      consume_credits: {
        Args: { p_user_id: string; p_amount: number; p_reason?: string };
        Returns: boolean;
      };
      consume_user_quota_daily: {
        Args: { p_user_id: string; p_amount?: number };
        Returns: void;
      };
      increment_user_quota_daily: {
        Args: { p_user_id: string; p_amount?: number };
        Returns: void;
      };
      get_usage_dashboard: {
        Args: { p_user_id: string };
        Returns: {
          balance: number;
          today_usage: number;
          month_usage: number;
        }[];
      };
      get_usage_summary: {
        Args: { p_user_id: string };
        Returns: {
          total_credits_used: number;
          total_events: number;
          last_event_at: string | null;
        }[];
      };
      get_user_limits: {
        Args: { p_user_id: string };
        Returns: {
          plan_id: string;
          monthly_credits: number;
          max_projects: number;
          max_brand_kits: number;
          features: Json;
        }[];
      };
      get_usage_timeseries: {
        Args: { p_user_id: string; p_days?: number };
        Returns: { day: string; credits_used: number }[];
      };
      get_monthly_usage: {
        Args: { p_user_id: string; p_months?: number };
        Returns: { month: string; credits_used: number }[];
      };
      usage_by_day: {
        Args: { p_user_id: string; p_days?: number };
        Returns: {
          day: string;
          total_cost_units: number;
          event_count: number;
        }[];
      };
      credits_usage_by_day: {
        Args: { p_user_id: string; p_days?: number };
        Returns: { day: string; credits_used: number }[];
      };
    };
    Enums: {};
  };
}

// ── Helpers de tipos ──────────────────────────────────────────
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// ── Tipos específicos exportados ──────────────────────────────
export type ProjectRow = Tables<"projects">;
export type UserSubscriptionRow = Tables<"user_subscriptions">;
export type UsageEventRow = Tables<"usage_events">;
export type UserCreditsRow = Tables<"user_credits">;
export type BrandKitRow = Tables<"brand_kits">;
export type TemplateRow = Tables<"templates">;
export type PlanRow = Tables<"plans">;
export type BillingSettingsRow = Tables<"billing_settings">;
export type StripeWebhookEventRow = Tables<"stripe_webhook_events">;