import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: () => { throw redirect({ to: "/overview" }); },
  head: () => ({
    meta: [
      { title: "Prototype workspace — Delivery Exception Ops" },
      { name: "description", content: "Enter the delivery exception operations prototype." },
      { property: "og:title", content: "Prototype workspace — Delivery Exception Ops" },
      { property: "og:description", content: "Enter the delivery exception operations prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
