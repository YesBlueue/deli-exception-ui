import type { Tables } from "@/infrastructure/supabase/types";
export interface PortalSnapshot {
  user: { id: string; name: string; email: string };
  isStaff: boolean;
  sellerId: string | null;
  customerOrderIds: string[];
  orders: Tables<"delivery_jobs">[];
  sellers: Tables<"sellers">[];
  exceptions: Tables<"delivery_exceptions">[];
  reports: Tables<"complaints">[];
  replies: Tables<"complaint_replies">[];
  events: Tables<"delivery_events">[];
  notes: Tables<"exception_notes">[];
  history: Tables<"report_history">[];
  updates: Tables<"seller_portal_updates">[];
  audit: Tables<"activity_logs">[];
  staff: Tables<"staff_profiles">[];
  reads: Tables<"portal_reads">[];
  attachments: Tables<"complaint_attachments">[];
  sellerExceptions: {
    id: string;
    delivery_job_id: string;
    order_reference: string;
    exception_type: string;
    status: string;
    detected_at: string;
    provenance: string;
  }[];
}
