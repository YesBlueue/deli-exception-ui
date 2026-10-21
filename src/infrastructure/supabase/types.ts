export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string;
          actor_type: string;
          actor_user_id: string | null;
          complaint_id: string | null;
          created_at: string;
          delivery_exception_id: string | null;
          delivery_job_id: string | null;
          description: string;
          driver_report_id: string | null;
          id: string;
          metadata: Json;
        };
        Insert: {
          action_type: string;
          actor_type: string;
          actor_user_id?: string | null;
          complaint_id?: string | null;
          created_at?: string;
          delivery_exception_id?: string | null;
          delivery_job_id?: string | null;
          description: string;
          driver_report_id?: string | null;
          id?: string;
          metadata?: Json;
        };
        Update: {
          action_type?: string;
          actor_type?: string;
          actor_user_id?: string | null;
          complaint_id?: string | null;
          created_at?: string;
          delivery_exception_id?: string | null;
          delivery_job_id?: string | null;
          description?: string;
          driver_report_id?: string | null;
          id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_delivery_exception_id_fkey";
            columns: ["delivery_exception_id"];
            isOneToOne: false;
            referencedRelation: "delivery_exceptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_driver_report_id_fkey";
            columns: ["driver_report_id"];
            isOneToOne: false;
            referencedRelation: "driver_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      apology_drafts: {
        Row: {
          author_user_id: string;
          body: string;
          complaint_id: string;
          created_at: string;
          id: string;
          model: string;
        };
        Insert: {
          author_user_id: string;
          body: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          model: string;
        };
        Update: {
          author_user_id?: string;
          body?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          model?: string;
        };
        Relationships: [
          {
            foreignKeyName: "apology_drafts_author_user_id_fkey";
            columns: ["author_user_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "apology_drafts_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      company_profile: {
        Row: {
          created_at: string;
          name: string;
          singleton: boolean;
          support_email: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          name: string;
          singleton?: boolean;
          support_email?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          name?: string;
          singleton?: boolean;
          support_email?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      complaint_attachments: {
        Row: {
          complaint_id: string;
          created_at: string;
          file_size_bytes: number;
          id: string;
          mime_type: string;
          original_filename: string | null;
          storage_path: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          file_size_bytes: number;
          id?: string;
          mime_type: string;
          original_filename?: string | null;
          storage_path: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          file_size_bytes?: number;
          id?: string;
          mime_type?: string;
          original_filename?: string | null;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_attachments_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaint_replies: {
        Row: {
          author_type: string;
          author_user_id: string | null;
          body: string;
          complaint_id: string;
          created_at: string;
          id: string;
          reply_type: string;
        };
        Insert: {
          author_type: string;
          author_user_id?: string | null;
          body: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          reply_type: string;
        };
        Update: {
          author_type?: string;
          author_user_id?: string | null;
          body?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          reply_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_replies_author_user_id_fkey";
            columns: ["author_user_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "complaint_replies_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          category: string;
          category_confidence: number | null;
          category_reason: string | null;
          complaint_reference: string;
          created_at: string;
          customer_description: string;
          customer_user_id: string;
          delivery_job_id: string;
          exception_id: string | null;
          id: string;
          needs_review: boolean;
          original_classification: Json;
          refund_requested: boolean;
          resolution_summary: string | null;
          resolved_at: string | null;
          rule_version: string;
          status: string;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          category?: string;
          category_confidence?: number | null;
          category_reason?: string | null;
          complaint_reference: string;
          created_at?: string;
          customer_description: string;
          customer_user_id: string;
          delivery_job_id: string;
          exception_id?: string | null;
          id?: string;
          needs_review?: boolean;
          original_classification?: Json;
          refund_requested?: boolean;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          rule_version?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          category_confidence?: number | null;
          category_reason?: string | null;
          complaint_reference?: string;
          created_at?: string;
          customer_description?: string;
          customer_user_id?: string;
          delivery_job_id?: string;
          exception_id?: string | null;
          id?: string;
          needs_review?: boolean;
          original_classification?: Json;
          refund_requested?: boolean;
          resolution_summary?: string | null;
          resolved_at?: string | null;
          rule_version?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_customer_user_id_fkey";
            columns: ["customer_user_id"];
            isOneToOne: false;
            referencedRelation: "customer_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "complaints_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_exception_id_fkey";
            columns: ["exception_id"];
            isOneToOne: false;
            referencedRelation: "delivery_exceptions";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_delivery_access: {
        Row: {
          confirmed_at: string;
          created_at: string;
          customer_user_id: string;
          delivery_job_id: string;
          id: string;
        };
        Insert: {
          confirmed_at?: string;
          created_at?: string;
          customer_user_id: string;
          delivery_job_id: string;
          id?: string;
        };
        Update: {
          confirmed_at?: string;
          created_at?: string;
          customer_user_id?: string;
          delivery_job_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_delivery_access_customer_user_id_fkey";
            columns: ["customer_user_id"];
            isOneToOne: false;
            referencedRelation: "customer_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "customer_delivery_access_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_delivery_updates: {
        Row: {
          body: string;
          customer_id: string;
          delivery_id: string;
          id: string;
          published_at: string;
          read_at: string | null;
          report_id: string;
          report_revision: number;
          review_id: string;
        };
        Insert: {
          body: string;
          customer_id: string;
          delivery_id: string;
          id?: string;
          published_at?: string;
          read_at?: string | null;
          report_id: string;
          report_revision: number;
          review_id: string;
        };
        Update: {
          body?: string;
          customer_id?: string;
          delivery_id?: string;
          id?: string;
          published_at?: string;
          read_at?: string | null;
          report_id?: string;
          report_revision?: number;
          review_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_delivery_updates_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_delivery_updates_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "driver_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_delivery_updates_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "notification_reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      delivery_events: {
        Row: {
          created_at: string;
          delivery_job_id: string;
          description: string | null;
          event_at: string | null;
          event_code: string;
          id: string;
          processing_result: string;
          raw_payload: Json | null;
          received_at: string;
          source: string;
          source_event_id: string | null;
        };
        Insert: {
          created_at?: string;
          delivery_job_id: string;
          description?: string | null;
          event_at?: string | null;
          event_code: string;
          id?: string;
          processing_result?: string;
          raw_payload?: Json | null;
          received_at?: string;
          source: string;
          source_event_id?: string | null;
        };
        Update: {
          created_at?: string;
          delivery_job_id?: string;
          description?: string | null;
          event_at?: string | null;
          event_code?: string;
          id?: string;
          processing_result?: string;
          raw_payload?: Json | null;
          received_at?: string;
          source?: string;
          source_event_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_exceptions: {
        Row: {
          assignee_user_id: string | null;
          created_at: string;
          delivery_job_id: string;
          detected_at: string;
          exception_type: string;
          id: string;
          priority: string;
          priority_reason: string;
          priority_rule_id: string | null;
          resolved_at: string | null;
          status: string;
          trigger_event_id: string | null;
          updated_at: string;
        };
        Insert: {
          assignee_user_id?: string | null;
          created_at?: string;
          delivery_job_id: string;
          detected_at?: string;
          exception_type: string;
          id?: string;
          priority: string;
          priority_reason: string;
          priority_rule_id?: string | null;
          resolved_at?: string | null;
          status?: string;
          trigger_event_id?: string | null;
          updated_at?: string;
        };
        Update: {
          assignee_user_id?: string | null;
          created_at?: string;
          delivery_job_id?: string;
          detected_at?: string;
          exception_type?: string;
          id?: string;
          priority?: string;
          priority_reason?: string;
          priority_rule_id?: string | null;
          resolved_at?: string | null;
          status?: string;
          trigger_event_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_exceptions_assignee_user_id_fkey";
            columns: ["assignee_user_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "delivery_exceptions_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_exceptions_priority_rule_id_fkey";
            columns: ["priority_rule_id"];
            isOneToOne: false;
            referencedRelation: "priority_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_exceptions_trigger_event_id_fkey";
            columns: ["trigger_event_id"];
            isOneToOne: false;
            referencedRelation: "delivery_events";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_jobs: {
        Row: {
          confirmation_details: string | null;
          created_at: string;
          delivered_at: string | null;
          delivery_address: string;
          external_delivery_id: string | null;
          id: string;
          provenance: string;
          received_at: string;
          recipient_email: string;
          recipient_name: string | null;
          recipient_phone: string | null;
          seller_id: string;
          seller_order_reference: string | null;
          shipped_at: string | null;
          source_system: string;
          source_updated_at: string | null;
          status: string;
          tracking_number: string;
          updated_at: string;
        };
        Insert: {
          confirmation_details?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          delivery_address: string;
          external_delivery_id?: string | null;
          id?: string;
          provenance?: string;
          received_at?: string;
          recipient_email: string;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          seller_id: string;
          seller_order_reference?: string | null;
          shipped_at?: string | null;
          source_system?: string;
          source_updated_at?: string | null;
          status?: string;
          tracking_number: string;
          updated_at?: string;
        };
        Update: {
          confirmation_details?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          delivery_address?: string;
          external_delivery_id?: string | null;
          id?: string;
          provenance?: string;
          received_at?: string;
          recipient_email?: string;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          seller_id?: string;
          seller_order_reference?: string | null;
          shipped_at?: string | null;
          source_system?: string;
          source_updated_at?: string | null;
          status?: string;
          tracking_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_jobs_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_portal_links: {
        Row: {
          created_at: string;
          delivery_job_id: string;
          expires_at: string;
          id: string;
          token_hash: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          delivery_job_id: string;
          expires_at: string;
          id?: string;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          delivery_job_id?: string;
          expires_at?: string;
          id?: string;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_portal_links_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_assignments: {
        Row: {
          delivery_id: string;
          driver_id: string;
          id: string;
          provenance: string;
          received_at: string;
          source_id: string;
          source_system: string;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          delivery_id: string;
          driver_id: string;
          id?: string;
          provenance: string;
          received_at?: string;
          source_id: string;
          source_system: string;
          valid_from: string;
          valid_to?: string | null;
        };
        Update: {
          delivery_id?: string;
          driver_id?: string;
          id?: string;
          provenance?: string;
          received_at?: string;
          source_id?: string;
          source_system?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "driver_assignments_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_assignments_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      driver_evidence: {
        Row: {
          created_at: string;
          id: string;
          original_filename: string;
          report_id: string;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          original_filename: string;
          report_id: string;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          original_filename?: string;
          report_id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_evidence_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "driver_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_reports: {
        Row: {
          category: string;
          correction_reason: string | null;
          delivery_id: string | null;
          details: string;
          driver_id: string;
          exception_id: string | null;
          id: string;
          kind: string;
          occurred_at: string;
          received_at: string;
          revision: number;
          scope_ids: string[];
          source: string;
          state: string;
        };
        Insert: {
          category: string;
          correction_reason?: string | null;
          delivery_id?: string | null;
          details: string;
          driver_id: string;
          exception_id?: string | null;
          id?: string;
          kind: string;
          occurred_at: string;
          received_at?: string;
          revision?: number;
          scope_ids?: string[];
          source?: string;
          state?: string;
        };
        Update: {
          category?: string;
          correction_reason?: string | null;
          delivery_id?: string | null;
          details?: string;
          driver_id?: string;
          exception_id?: string | null;
          id?: string;
          kind?: string;
          occurred_at?: string;
          received_at?: string;
          revision?: number;
          scope_ids?: string[];
          source?: string;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_reports_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_reports_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "driver_reports_exception_id_fkey";
            columns: ["exception_id"];
            isOneToOne: false;
            referencedRelation: "delivery_exceptions";
            referencedColumns: ["id"];
          },
        ];
      };
      exception_notes: {
        Row: {
          author_user_id: string;
          body: string;
          created_at: string;
          exception_id: string;
          id: string;
        };
        Insert: {
          author_user_id: string;
          body: string;
          created_at?: string;
          exception_id: string;
          id?: string;
        };
        Update: {
          author_user_id?: string;
          body?: string;
          created_at?: string;
          exception_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exception_notes_author_user_id_fkey";
            columns: ["author_user_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "exception_notes_exception_id_fkey";
            columns: ["exception_id"];
            isOneToOne: false;
            referencedRelation: "delivery_exceptions";
            referencedColumns: ["id"];
          },
        ];
      };
      exception_priority_evaluations: {
        Row: {
          calculated_priority: string;
          evaluated_at: string;
          exception_id: string;
          explanation: string;
          id: string;
          priority_rule_id: string | null;
          relevant_inputs: Json;
        };
        Insert: {
          calculated_priority: string;
          evaluated_at?: string;
          exception_id: string;
          explanation: string;
          id?: string;
          priority_rule_id?: string | null;
          relevant_inputs?: Json;
        };
        Update: {
          calculated_priority?: string;
          evaluated_at?: string;
          exception_id?: string;
          explanation?: string;
          id?: string;
          priority_rule_id?: string | null;
          relevant_inputs?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "exception_priority_evaluations_exception_id_fkey";
            columns: ["exception_id"];
            isOneToOne: false;
            referencedRelation: "delivery_exceptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exception_priority_evaluations_priority_rule_id_fkey";
            columns: ["priority_rule_id"];
            isOneToOne: false;
            referencedRelation: "priority_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_reviews: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          assessment: Json;
          body: string;
          created_at: string;
          created_by: string;
          id: string;
          model: string | null;
          origin: string;
          published_at: string | null;
          report_id: string;
          report_revision: number;
          state: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          assessment: Json;
          body: string;
          created_at?: string;
          created_by: string;
          id?: string;
          model?: string | null;
          origin: string;
          published_at?: string | null;
          report_id: string;
          report_revision: number;
          state?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          assessment?: Json;
          body?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          model?: string | null;
          origin?: string;
          published_at?: string | null;
          report_id?: string;
          report_revision?: number;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_reviews_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notification_reviews_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notification_reviews_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "driver_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_link_emails: {
        Row: {
          created_at: string;
          delivery_job_id: string;
          delivery_status: string;
          id: string;
          portal_link_id: string;
          provider_message_id: string | null;
          recipient_email: string;
          sent_at: string | null;
        };
        Insert: {
          created_at?: string;
          delivery_job_id: string;
          delivery_status?: string;
          id?: string;
          portal_link_id: string;
          provider_message_id?: string | null;
          recipient_email: string;
          sent_at?: string | null;
        };
        Update: {
          created_at?: string;
          delivery_job_id?: string;
          delivery_status?: string;
          id?: string;
          portal_link_id?: string;
          provider_message_id?: string | null;
          recipient_email?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "portal_link_emails_delivery_job_id_fkey";
            columns: ["delivery_job_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portal_link_emails_portal_link_id_fkey";
            columns: ["portal_link_id"];
            isOneToOne: false;
            referencedRelation: "delivery_portal_links";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_reads: {
        Row: {
          complaint_id: string;
          seen_at: string;
          user_id: string;
        };
        Insert: {
          complaint_id: string;
          seen_at?: string;
          user_id: string;
        };
        Update: {
          complaint_id?: string;
          seen_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portal_reads_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      priority_rules: {
        Row: {
          conditions: Json;
          created_at: string;
          exception_type: string;
          explanation_template: string;
          id: string;
          is_active: boolean;
          name: string;
          priority: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          conditions?: Json;
          created_at?: string;
          exception_type: string;
          explanation_template: string;
          id?: string;
          is_active?: boolean;
          name: string;
          priority: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          conditions?: Json;
          created_at?: string;
          exception_type?: string;
          explanation_template?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          priority?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_history: {
        Row: {
          complaint_id: string;
          created_at: string;
          description: string;
          id: string;
          status: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          description: string;
          id?: string;
          status: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_history_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_portal_updates: {
        Row: {
          body: string;
          complaint_id: string | null;
          created_at: string;
          delivery_job_id: string;
          id: string;
          read_at: string | null;
          seller_id: string;
          title: string;
          update_type: string;
        };
        Insert: {
          body: string;
          complaint_id?: string | null;
          created_at?: string;
          delivery_job_id: string;
          id?: string;
          read_at?: string | null;
          seller_id: string;
          title: string;
          update_type: string;
        };
        Update: {
          body?: string;
          complaint_id?: string | null;
          created_at?: string;
          delivery_job_id?: string;
          id?: string;
          read_at?: string | null;
          seller_id?: string;
          title?: string;
          update_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_portal_updates_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_portal_updates_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_updates_job_seller_fk";
            columns: ["delivery_job_id", "seller_id"];
            isOneToOne: false;
            referencedRelation: "delivery_jobs";
            referencedColumns: ["id", "seller_id"];
          },
        ];
      };
      seller_users: {
        Row: {
          created_at: string;
          full_name: string | null;
          is_active: boolean;
          role: string;
          seller_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          is_active?: boolean;
          role?: string;
          seller_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          is_active?: boolean;
          role?: string;
          seller_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_users_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      sellers: {
        Row: {
          contact_email: string;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string;
          external_seller_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          contact_email: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          external_seller_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          external_seller_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          created_at: string;
          full_name: string;
          is_active: boolean;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          is_active?: boolean;
          role: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      driver_command: { Args: { command: string; input?: Json }; Returns: Json };
      driver_workspace: { Args: never; Returns: Json };
      notification_fingerprint: { Args: { review_id: string }; Returns: string };
      portal_command: { Args: { command: string; input?: Json }; Returns: Json };
      register_driver_evidence: {
        Args: { filename: string; path: string; report_id: string };
        Returns: undefined;
      };
      register_evidence: {
        Args: {
          filename: string;
          mime: string;
          path: string;
          report_id: string;
          size_bytes: number;
        };
        Returns: undefined;
      };
      seller_exception_context: { Args: never; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
