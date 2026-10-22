export interface DriverReport {
  id: string;
  driver_id: string;
  kind: "ATTEMPT" | "CONDITION";
  category: string;
  delivery_id: string | null;
  exception_id: string | null;
  occurred_at: string;
  received_at: string;
  details: string;
  state: "RECEIVED" | "NEEDS_CORRECTION" | "CLOSED";
  correction_reason: string | null;
  revision: number;
  scope_ids: string[];
}
export interface ImpactDecision {
  deliveryId: string;
  orderReference: string;
  provenance: string;
  reason: string;
  sourceStatus: string;
  sourceUpdatedAt: string | null;
  recipients: { userId: string; associationId: string; confirmedAt: string }[];
  assignments: { driver_id: string; valid_from: string; valid_to: string | null }[];
}
export interface NotificationReview {
  fingerprint: string;
  id: string;
  report_id: string;
  report_revision: number;
  body: string;
  origin: string;
  model: string | null;
  state: "PREPARED" | "SUPERSEDED" | "PUBLISHED";
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  assessment: { decisions: ImpactDecision[]; rule: string; driverActive: boolean };
}
export interface DriverSnapshot {
  isDriver: boolean;
  isStaff: boolean;
  assignments: {
    id: string;
    delivery_id: string;
    driver_id: string;
    valid_from: string;
    valid_to: string | null;
    provenance: string;
    order_reference: string;
  }[];
  reports: DriverReport[];
  reviews: NotificationReview[];
  evidence: { id: string; report_id: string; original_filename: string }[];
  drivers: { id: string; name: string }[];
}
export interface DeliveryUpdate {
  id: string;
  delivery_id: string;
  body: string;
  published_at: string;
  read_at: string | null;
}
