import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { BrandMark, Notice, SiteShell } from "@/shared/ui/patterns";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <SiteShell width="sm" brand={<BrandMark icon={PackageSearch} name="Delivery company" />}>
      <div className="space-y-6 py-4">
        {params.error && (
          <Notice tone="error" role="alert">
            Google sign-in was cancelled or could not be completed. Try again.
          </Notice>
        )}
        <CustomerAccountForm />
        <nav aria-label="Portals" className="flex flex-wrap gap-4 border-t pt-4 text-sm">
          <Link href="/customer/complaint" className="text-primary hover:underline">
            Customer portal
          </Link>
          <Link href="/overview" className="text-primary hover:underline">
            Operations
          </Link>
          <Link href="/seller" className="text-primary hover:underline">
            Seller portal
          </Link>
          <Link href="/driver" className="text-primary hover:underline">
            Driver portal
          </Link>
          {process.env.NODE_ENV === "development" && (
            <Link href="/driver-test-login" className="text-primary hover:underline">
              Driver test sign-in
            </Link>
          )}
        </nav>
      </div>
    </SiteShell>
  );
}
