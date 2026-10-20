import { CustomerPreviewsView } from "@/features/customer-portal/components/CustomerPreviewsView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Customer previews — Exception Ops",
  description: "Preview the order-specific customer support portal and complaint flow.",
  ogDescription: "Fictional customer support portal scenarios.",
});

export default function CustomerPreviewsPage() {
  return <CustomerPreviewsView />;
}
