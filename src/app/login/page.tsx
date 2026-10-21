import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import Link from "next/link";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-16">
      {params.error && (
        <p role="alert" className="text-destructive">
          Google sign-in was cancelled or could not be completed. Try again.
        </p>
      )}
      <CustomerAccountForm />
      <div className="flex flex-wrap gap-4 text-sm text-primary">
        <Link href="/customer/complaint">Customer portal</Link>
        <Link href="/overview">Operations</Link>
        <Link href="/seller">Seller portal</Link>
      </div>
    </main>
  );
}
