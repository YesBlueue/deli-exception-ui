import { OverviewView } from "@/features/exceptions/components/OverviewView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Operations overview",
  description:
    "Review urgent delivery exceptions and customer complaints in one operations overview.",
  ogDescription: "Delivery exception priorities and customer care workload.",
});

export default function OverviewPage() {
  return <OverviewView />;
}
