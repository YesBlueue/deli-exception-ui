import { redirect } from "next/navigation";
/** Retired demo links never authorize order access. */
export default function RetiredCustomerLink() {
  redirect("/customer/complaint");
}
