import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicEnv } from "@/lib/env/public";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type PortalDatabase = {
  public: {
    Tables: {
      client_portfolios: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          created_at: string;
          valuation_zar: number | null;
          valuation_as_of: string | null;
          performance_percent: number | null;
          performance_period: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          created_at?: string;
          valuation_zar?: number | null;
          valuation_as_of?: string | null;
          performance_percent?: number | null;
          performance_period?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          created_at?: string;
          valuation_zar?: number | null;
          valuation_as_of?: string | null;
          performance_percent?: number | null;
          performance_period?: string | null;
        };
        Relationships: [];
      };
      client_allocations: {
        Row: {
          id: string;
          portfolio_id: string;
          asset_class: string;
          allocation_percent: number;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          asset_class: string;
          allocation_percent: number;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          asset_class?: string;
          allocation_percent?: number;
        };
        Relationships: [];
      };
      client_transactions: {
        Row: {
          id: string;
          user_id: string;
          transacted_at: string;
          description: string;
          amount: number;
          status: string;
          account_type: "Unit Trust" | "TFSA" | "RA" | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          transacted_at?: string;
          description: string;
          amount: number;
          status?: string;
          account_type?: "Unit Trust" | "TFSA" | "RA" | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          transacted_at?: string;
          description?: string;
          amount?: number;
          status?: string;
          account_type?: "Unit Trust" | "TFSA" | "RA" | null;
        };
        Relationships: [];
      };
      client_support_messages: {
        Row: {
          id: string;
          user_id: string;
          sender_role: "client" | "manager";
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sender_role?: "client" | "manager";
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sender_role?: "client" | "manager";
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      client_documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          document_type: string;
          object_path: string;
          issued_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          document_type: string;
          object_path: string;
          issued_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          document_type?: string;
          object_path?: string;
          issued_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_portal_requests: {
        Row: {
          id: string;
          user_id: string;
          request_type: string;
          details: string;
          status: "Submitted" | "In Review" | "Completed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          request_type: string;
          details: string;
          status?: "Submitted" | "In Review" | "Completed";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          request_type?: string;
          details?: string;
          status?: "Submitted" | "In Review" | "Completed";
          created_at?: string;
        };
        Relationships: [];
      };
      manager_updates: {
        Row: {
          id: string;
          public_slug: string;
          title: string;
          body: string;
          kind: "text" | "audio" | "video";
          media_path: string | null;
          category: string;
          author_name: string | null;
          author_designation: string | null;
          author_bio: string | null;
          executive_summary: string | null;
          key_takeaways: string[];
          placeholder_perspective: string | null;
          related_slugs: string[];
          strategy: "PLACEHOLDER BRAND Balanced" | "PLACEHOLDER BRAND Cautious" | "Both";
          featured: boolean;
          scheduled_at: string | null;
          pdf_object_path: string | null;
          created_by: string | null;
          internal_review_by: string | null;
          internal_review_at: string | null;
          status: "draft" | "internal_review" | "approved" | "published" | "archived";
          approved_by: string | null;
          approved_at: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          public_slug: string;
          title: string;
          body: string;
          kind: "text" | "audio" | "video";
          media_path?: string | null;
          category?: string;
          author_name?: string | null;
          author_designation?: string | null;
          author_bio?: string | null;
          executive_summary?: string | null;
          key_takeaways?: string[];
          placeholder_perspective?: string | null;
          related_slugs?: string[];
          strategy?: "PLACEHOLDER BRAND Balanced" | "PLACEHOLDER BRAND Cautious" | "Both";
          featured?: boolean;
          scheduled_at?: string | null;
          pdf_object_path?: string | null;
          created_by?: string | null;
          internal_review_by?: string | null;
          internal_review_at?: string | null;
          status?: "draft" | "internal_review" | "approved" | "published" | "archived";
          approved_by?: string | null;
          approved_at?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          public_slug?: string;
          title?: string;
          body?: string;
          kind?: "text" | "audio" | "video";
          media_path?: string | null;
          category?: string;
          author_name?: string | null;
          author_designation?: string | null;
          author_bio?: string | null;
          executive_summary?: string | null;
          key_takeaways?: string[];
          placeholder_perspective?: string | null;
          related_slugs?: string[];
          strategy?: "PLACEHOLDER BRAND Balanced" | "PLACEHOLDER BRAND Cautious" | "Both";
          featured?: boolean;
          scheduled_at?: string | null;
          pdf_object_path?: string | null;
          created_by?: string | null;
          internal_review_by?: string | null;
          internal_review_at?: string | null;
          status?: "draft" | "internal_review" | "approved" | "published" | "archived";
          approved_by?: string | null;
          approved_at?: string | null;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      client_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date: string;
          monthly_contribution: number;
          assumed_annual_growth_percent: number;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date: string;
          monthly_contribution: number;
          assumed_annual_growth_percent: number;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          target_date?: string;
          monthly_contribution?: number;
          assumed_annual_growth_percent?: number;
          created_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      adviser_client_relationships: {
        Row: {
          id: string;
          adviser_user_id: string;
          client_user_id: string;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          adviser_user_id: string;
          client_user_id: string;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          adviser_user_id?: string;
          client_user_id?: string;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      platforms: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fund_share_classes: {
        Row: {
          id: string;
          fund_name: string;
          share_class: string;
          jse_code: string | null;
          isin: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fund_name: string;
          share_class: string;
          jse_code?: string | null;
          isin?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fund_name?: string;
          share_class?: string;
          jse_code?: string | null;
          isin?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_availability: {
        Row: {
          id: string;
          share_class_id: string;
          platform_id: string;
          status: "verified_available" | "verified_unavailable" | "not_verified";
          platform_fund_code: string | null;
          source: string | null;
          source_url: string | null;
          verified_by: string | null;
          verified_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          share_class_id: string;
          platform_id: string;
          status: "verified_available" | "verified_unavailable" | "not_verified";
          platform_fund_code?: string | null;
          source?: string | null;
          source_url?: string | null;
          verified_by?: string | null;
          verified_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          share_class_id?: string;
          platform_id?: string;
          status?: "verified_available" | "verified_unavailable" | "not_verified";
          platform_fund_code?: string | null;
          source?: string | null;
          source_url?: string | null;
          verified_by?: string | null;
          verified_on?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_availability_history: {
        Row: {
          id: number;
          availability_id: string;
          action: "insert" | "update" | "delete";
          old_values: Json | null;
          new_values: Json;
          changed_at: string;
        };
        Insert: {
          id?: number;
          availability_id: string;
          action: "insert" | "update" | "delete";
          old_values?: Json | null;
          new_values: Json;
          changed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      support_threads: {
        Row: { id: string; client_user_id: string; subject: string; status: "open" | "pending" | "resolved" | "closed"; assigned_to: string | null; first_response_at: string | null; resolved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; client_user_id: string; subject: string; status?: "open" | "pending" | "resolved" | "closed"; assigned_to?: string | null; first_response_at?: string | null; resolved_at?: string | null; created_at?: string; updated_at?: string };
        Update: { subject?: string; status?: "open" | "pending" | "resolved" | "closed"; assigned_to?: string | null; first_response_at?: string | null; resolved_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      support_thread_messages: {
        Row: { id: string; thread_id: string; author_user_id: string; sender_role: "client" | "staff"; body: string; internal_note: boolean; created_at: string };
        Insert: { id?: string; thread_id: string; author_user_id: string; sender_role: "client" | "staff"; body: string; internal_note?: boolean; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      canned_replies: {
        Row: { id: string; title: string; body: string; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; title: string; body: string; created_by: string; created_at?: string; updated_at?: string };
        Update: { title?: string; body?: string; updated_at?: string };
        Relationships: [];
      };
      personal_detail_verifications: {
        Row: { id: string; request_id: string; verified_by: string; verification_method: "phone"; verified_at: string; note: string | null; created_at: string };
        Insert: { id?: string; request_id: string; verified_by: string; verification_method: "phone"; verified_at: string; note?: string | null; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      staff_announcements: {
        Row: { id: string; title: string; body: string; status: "draft" | "approved" | "sent"; approved_by: string | null; approved_at: string | null; sent_at: string | null; created_by: string; created_at: string };
        Insert: { id?: string; title: string; body: string; status?: "draft" | "approved" | "sent"; approved_by?: string | null; approved_at?: string | null; sent_at?: string | null; created_by: string; created_at?: string };
        Update: { status?: "draft" | "approved" | "sent"; approved_by?: string | null; approved_at?: string | null; sent_at?: string | null };
        Relationships: [];
      };
      staff_announcement_recipients: {
        Row: { id: string; announcement_id: string; client_user_id: string; sent_at: string };
        Insert: { id?: string; announcement_id: string; client_user_id: string; sent_at: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      compliance_register_entries: {
        Row: { id: string; register_type: string; title: string; details: Json; object_path: string | null; is_active: boolean; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; register_type: string; title: string; details?: Json; object_path?: string | null; is_active?: boolean; created_by: string; created_at?: string; updated_at?: string };
        Update: { title?: string; details?: Json; object_path?: string | null; is_active?: boolean; updated_at?: string };
        Relationships: [];
      };
      compliance_register_history: {
        Row: { id: number; entry_id: string; register_type: string; action: "insert" | "update" | "deactivate"; old_values: Json | null; new_values: Json; changed_by: string; changed_at: string };
        Insert: { id?: number; entry_id: string; register_type: string; action: "insert" | "update" | "deactivate"; old_values?: Json | null; new_values: Json; changed_by: string; changed_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      compliance_monthly_signoffs: {
        Row: { id: string; register_type: string; review_month: string; reviewed_by: string; completed_at: string; note: string | null };
        Insert: { id?: string; register_type: string; review_month: string; reviewed_by: string; completed_at?: string; note?: string | null };
        Update: Record<string, never>;
        Relationships: [];
      };
      portal_notifications: {
        Row: { id: string; user_id: string; title: string; body: string; kind: "document" | "request" | "adviser" | "review" | "security" | "general"; link: string | null; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; title: string; body: string; kind?: "document" | "request" | "adviser" | "review" | "security" | "general"; link?: string | null; read_at?: string | null; created_at?: string };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      adviser_reviews: {
        Row: { id: string; adviser_user_id: string; client_user_id: string; scheduled_at: string | null; completed_at: string | null; outcome: string | null; follow_up_at: string | null; follow_up_owner: string | null; status: "scheduled" | "completed" | "cancelled"; created_at: string; updated_at: string };
        Insert: { id?: string; adviser_user_id: string; client_user_id: string; scheduled_at?: string | null; completed_at?: string | null; outcome?: string | null; follow_up_at?: string | null; follow_up_owner?: string | null; status?: "scheduled" | "completed" | "cancelled"; created_at?: string; updated_at?: string };
        Update: { scheduled_at?: string | null; completed_at?: string | null; outcome?: string | null; follow_up_at?: string | null; follow_up_owner?: string | null; status?: "scheduled" | "completed" | "cancelled"; updated_at?: string };
        Relationships: [];
      };
      onboarding_checklists: {
        Row: {
          id: string;
          client_user_id: string;
          document_class: string;
          status: "requested" | "received" | "under_review" | "approved" | "rejected";
          rejection_reason: string | null;
          reviewer_user_id: string | null;
          reviewer_at: string | null;
          refresh_due_on: string | null;
          retention_days: number | null;
          object_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_user_id: string;
          document_class: string;
          status?: "requested" | "received" | "under_review" | "approved" | "rejected";
          rejection_reason?: string | null;
          reviewer_user_id?: string | null;
          reviewer_at?: string | null;
          refresh_due_on?: string | null;
          retention_days?: number | null;
          object_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "requested" | "received" | "under_review" | "approved" | "rejected";
          rejection_reason?: string | null;
          reviewer_user_id?: string | null;
          reviewer_at?: string | null;
          refresh_due_on?: string | null;
          retention_days?: number | null;
          object_path?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      onboarding_document_access: {
        Row: {
          id: number;
          checklist_id: string;
          actor_user_id: string;
          action: "view" | "download";
          accessed_at: string;
        };
        Insert: {
          id?: number;
          checklist_id: string;
          actor_user_id: string;
          action: "view" | "download";
          accessed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      site_documents: {
        Row: {
          id: string;
          slug: string;
          title: string;
          version: number;
          object_path: string;
          effective_date: string;
          document_category: string;
          strategy: string | null;
          file_format: string;
          file_size_bytes: number | null;
          checksum_sha256: string | null;
          featured: boolean;
          scheduled_at: string | null;
          author_name: string | null;
          author_designation: string | null;
          internal_review_by: string | null;
          internal_review_at: string | null;
          status: "draft" | "internal_review" | "approved" | "published" | "archived";
          approved_by: string | null;
          approved_at: string | null;
          published_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          version: number;
          object_path: string;
          effective_date: string;
          document_category?: string;
          strategy?: string | null;
          file_format?: string;
          file_size_bytes?: number | null;
          checksum_sha256?: string | null;
          featured?: boolean;
          scheduled_at?: string | null;
          author_name?: string | null;
          author_designation?: string | null;
          internal_review_by?: string | null;
          internal_review_at?: string | null;
          status?: "draft" | "internal_review" | "approved" | "published" | "archived";
          approved_by?: string | null;
          approved_at?: string | null;
          published_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          object_path?: string;
          effective_date?: string;
          document_category?: string;
          strategy?: string | null;
          file_format?: string;
          file_size_bytes?: number | null;
          checksum_sha256?: string | null;
          featured?: boolean;
          scheduled_at?: string | null;
          author_name?: string | null;
          author_designation?: string | null;
          internal_review_by?: string | null;
          internal_review_at?: string | null;
          status?: "draft" | "internal_review" | "approved" | "published" | "archived";
          approved_by?: string | null;
          approved_at?: string | null;
          published_at?: string | null;
        };
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          id: string;
          role: "admin" | "adviser" | "compliance" | "operations";
          full_name: string;
          is_active: boolean;
          last_sign_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: "admin" | "adviser" | "compliance" | "operations";
          full_name: string;
          is_active?: boolean;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: "admin" | "adviser" | "compliance" | "operations";
          full_name?: string;
          is_active?: boolean;
          last_sign_in_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      client_crm_notes: {
        Row: {
          id: string;
          client_user_id: string;
          author_user_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_user_id: string;
          author_user_id: string;
          note: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      client_crm_tasks: {
        Row: {
          id: string;
          client_user_id: string;
          owner_user_id: string | null;
          title: string;
          details: string | null;
          follow_up_on: string | null;
          review_on: string | null;
          status: "open" | "in_progress" | "completed" | "cancelled";
          tags: string[];
          complaints_flag: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_user_id: string;
          owner_user_id?: string | null;
          title: string;
          details?: string | null;
          follow_up_on?: string | null;
          review_on?: string | null;
          status?: "open" | "in_progress" | "completed" | "cancelled";
          tags?: string[];
          complaints_flag?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_user_id?: string | null;
          title?: string;
          details?: string | null;
          follow_up_on?: string | null;
          review_on?: string | null;
          status?: "open" | "in_progress" | "completed" | "cancelled";
          tags?: string[];
          complaints_flag?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_pages: {
        Row: {
          slug: string;
          content: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          slug: string;
          content: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          slug?: string;
          content?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      site_studio_versions: {
        Row: {
          id: string;
          tenant_id: string;
          slug: string;
          status: "draft" | "published";
          content: Json;
          created_by: string | null;
          created_at: string;
          published_by: string | null;
          published_at: string | null;
          source_version_id: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          slug?: string;
          status: "draft" | "published";
          content: Json;
          created_by?: string | null;
          created_at?: string;
          published_by?: string | null;
          published_at?: string | null;
          source_version_id?: string | null;
        };
        Update: {
          status?: "draft" | "published";
          content?: Json;
          created_by?: string | null;
          created_at?: string;
          published_by?: string | null;
          published_at?: string | null;
          source_version_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_api_rate_limit: {
        Args: {
          p_route_key: string;
          p_ip_hash: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: { allowed: boolean; retry_after: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let browserClient: SupabaseClient<PortalDatabase> | undefined;

export function getPortalSupabaseClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } =
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  browserClient ??= createBrowserClient<PortalDatabase>(url, anonKey, {
    auth: {
      experimental: { recoveryCodes: true },
    },
  });
  return browserClient;
}

export type {
  Json,
  PortalDatabase,
  SupabaseClient,
};
