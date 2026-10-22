import { EventSimulatorView } from "@/features/event-simulator/components/EventSimulatorView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Source update simulator",
  description:
    "Send fictional source-system updates to test normalisation, dedupe and prioritisation.",
});

export default function EventSimulatorPage() {
  return <EventSimulatorView />;
}
