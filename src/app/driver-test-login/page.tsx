import { notFound } from "next/navigation";
import { DriverTestLogin } from "@/features/portal/components/DriverTestLogin";
export const metadata = { title: "Local driver test sign-in", robots: { index: false } };
export default function DriverTestLoginPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DriverTestLogin />;
}
