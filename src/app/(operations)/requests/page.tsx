import { ComplaintsView } from "@/features/complaints/components/ComplaintsView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Customer complaints",
  description: "Review customer reports with recorded staff activity.",
  ogDescription: "Investigate customer complaints and publish customer-visible responses.",
});

export default function RequestsPage() {
  return <ComplaintsView />;
}
