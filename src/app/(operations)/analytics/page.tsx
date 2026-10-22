import { Suspense } from "react";
import { AnalyticsWorkspace } from "@/features/portal/components/AnalyticsWorkspace";
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<p>Loading complaint analytics…</p>}>
      <AnalyticsWorkspace />
    </Suspense>
  );
}
