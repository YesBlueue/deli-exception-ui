export type CarrierId = "gsx" | "irw" | "mgl";

export type NormalizedEventType =
  | "SHIPMENT_CREATED"
  | "IN_TRANSIT"
  | "ARRIVED_AT_HUB"
  | "DELAYED"
  | "INVALID_ADDRESS"
  | "DELIVERY_ATTEMPTED"
  | "DELIVERED"
  | "LOST"
  | "DAMAGED";

export type ShipmentStatus =
  | "CREATED"
  | "IN_TRANSIT"
  | "AT_HUB"
  | "DELAYED"
  | "ADDRESS_ISSUE"
  | "ATTEMPTED"
  | "DELIVERED"
  | "LOST"
  | "DAMAGED";

export type ExceptionType = "DELAYED" | "INVALID_ADDRESS" | "FAILED_DELIVERY" | "LOST" | "DAMAGED";
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type WorkflowStatus =
  | "NEW"
  | "ACTION_REQUIRED"
  | "AWAITING_CUSTOMER"
  | "AWAITING_CARRIER"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REOPENED";

export interface Address {
  recipient: string;
  phone: string;
  street: string;
  township: string;
  city: string;
  instructions?: string | undefined;
}

export interface Shipment {
  id: string;
  orgId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  carrierId: CarrierId;
  trackingId: string;
  /** Order value in MMK; null when unknown */
  valueMMK: number | null;
  status: ShipmentStatus;
  address: Address;
  createdAt: string;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  carrierId: CarrierId;
  carrierEventId: string | null;
  dedupeKey: string;
  raw: Record<string, unknown>;
  type: NormalizedEventType;
  /** null if the carrier did not send a timestamp */
  eventTime: string | null;
  ingestedAt: string;
}

export interface PriorityReason {
  rule: string;
  text: string;
}

export interface DeliveryException {
  id: string;
  orgId: string;
  shipmentId: string;
  type: ExceptionType;
  priority: Priority;
  reasons: PriorityReason[];
  missingData: string[];
  evaluatedAt: string;
  workflowStatus: WorkflowStatus;
  summary: string;
  openedAt: string;
  resolvedAt: string | null;
  assignee: string | null;
}

export interface ExceptionAction {
  id: string;
  exceptionId: string;
  actor: string;
  type: "MESSAGE_SENT" | "NOTE" | "CARRIER_REQUEST";
  summary: string;
  payload?: string;
  approval: "APPROVED" | "NOT_REQUIRED";
  simulated: boolean;
  at: string;
}

export interface WorkflowLog {
  id: string;
  exceptionId: string | null;
  actor: string;
  kind: "TRANSITION" | "AUTOMATION";
  from?: WorkflowStatus | null;
  to?: WorkflowStatus;
  reason: string;
  at: string;
}

export interface DB {
  version: number;
  shipments: Shipment[];
  events: ShipmentEvent[];
  exceptions: DeliveryException[];
  actions: ExceptionAction[];
  logs: WorkflowLog[];
  customerLinks: CustomerLink[];
  complaints: Complaint[];
  requestActivity: RequestActivity[];
}

export interface CustomerLink {
  access: string;
  shipmentId: string;
  expiresAt: string;
  revoked: boolean;
  estimatedDelivery: string | null;
}
export type ComplaintCategory = "DAMAGED" | "MISSING" | "WRONG" | "OTHER";
export type ComplaintStatus = "SUBMITTED" | "INVESTIGATING" | "RESOLVED" | "REJECTED";
export interface Complaint {
  id: string;
  reference: string;
  shipmentId: string;
  category: ComplaintCategory;
  description: string;
  photos: { name: string; dataUrl: string }[];
  status: ComplaintStatus;
  customerResponse: string;
  submittedAt: string;
  updatedAt: string;
}
export interface RequestActivity {
  id: string;
  requestId: string;
  actor: string;
  text: string;
  internalNote: string;
  at: string;
}
