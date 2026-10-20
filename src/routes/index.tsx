import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/overview" });
  },
  head: () => ({
    meta: [
      { title: "Delivery Exception Ops" },
      { name: "description", content: "Resolve multi-carrier delivery exceptions in one workspace." },
      { property: "og:title", content: "Delivery Exception Ops" },
      { property: "og:description", content: "Resolve multi-carrier delivery exceptions in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
