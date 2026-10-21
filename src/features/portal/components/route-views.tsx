import { OperationsWorkspace } from "./OperationsWorkspace";
export function OperationsOverview() {
  return <OperationsWorkspace view="overview" />;
}
export function OperationsInbox() {
  return <OperationsWorkspace view="inbox" />;
}
export function OperationsReports() {
  return <OperationsWorkspace view="reports" />;
}
