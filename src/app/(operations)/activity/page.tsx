import { ActivityWorkspace } from "@/features/portal/components/ActivityWorkspace";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "All activity",
  description: "Every recorded operations, customer, seller and driver action, newest first.",
});

export default function ActivityPage() {
  return <ActivityWorkspace />;
}
