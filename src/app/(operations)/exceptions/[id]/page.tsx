import { ExceptionDetailView } from "@/features/exceptions/components/ExceptionDetailView";
import { pageMetadata } from "@/shared/metadata";

export const metadata = pageMetadata({
  title: "Exception detail",
  description: "Investigate and resolve a delivery exception.",
});

export default async function ExceptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExceptionDetailView id={id} />;
}
