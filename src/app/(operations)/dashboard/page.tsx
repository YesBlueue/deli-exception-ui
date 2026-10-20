import { ExceptionInboxView } from "@/features/exceptions/components/ExceptionInboxView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Exception inbox — Delivery Exception Ops",
  description: "Actionable delivery exceptions across carriers, sorted by urgency.",
});

export default function DashboardPage() {
  return <ExceptionInboxView />;
}
