import { redirect } from "next/navigation";

/** The prototype has no staff sign-in; the old login URL goes straight to the workspace. */
export default function Login() {
  redirect("/overview");
}
