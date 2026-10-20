import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Delivery Exception Ops" },
      { name: "description", content: "Resolve multi-carrier delivery exceptions in one workspace." },
      { property: "og:title", content: "Delivery Exception Ops" },
      { property: "og:description", content: "Resolve multi-carrier delivery exceptions in one workspace." },
    ],
  }),
});
