import { CustomerPortalView } from "@/features/customer-portal/components/CustomerPortalView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Order support — Shwe Market",
  description: "Report a delivery problem and follow updates from the Shwe Market support team.",
  ogDescription: "Your order-specific support portal.",
  noIndex: true,
});

export default async function CustomerPortalPage({ params }: { params: Promise<{ access: string }> }) {
  const { access } = await params;
  return <CustomerPortalView access={access} />;
}
