import { EventSimulatorView } from "@/features/event-simulator/components/EventSimulatorView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Carrier event simulator — Delivery Exception Ops",
  description: "Send fictional carrier events to test normalisation, dedupe and prioritisation.",
});

export default function EventSimulatorPage() {
  return <EventSimulatorView />;
}
