import { ComplaintAppView } from "@/features/complaint-app/components/ComplaintAppView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Report an Order Problem — Shwe Market Support",
  description: "Log in or create a customer account to report an order problem to Shwe Market Support.",
  ogDescription: "Submit a complaint about your order in a few steps.",
  noIndex: true,
});

export default function ComplaintAppPage() {
  return <ComplaintAppView />;
}
