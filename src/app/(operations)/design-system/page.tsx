import { notFound } from "next/navigation";
import { DesignSystemView } from "@/features/design-system/components/DesignSystemView";

export const metadata = { title: "Design system", robots: { index: false } };

/** Development-only reference page; production builds return 404. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystemView />;
}
