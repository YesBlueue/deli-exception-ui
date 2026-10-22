import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const { nav } = vi.hoisted(() => ({ nav: { pathname: "/" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ clear: vi.fn() }) }));
vi.mock("@/infrastructure/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn() } } }));
import { Theme } from "@radix-ui/themes";
import { PortalNav } from "./shared";
const inTheme = { wrapper: Theme };
afterEach(cleanup);
it.each([
  ["/exceptions/abc", "Operations portal"],
  ["/customer/complaint", "Customer portal"],
  ["/seller", "Seller portal"],
  ["/driver", "Driver portal"],
])("names the current portal on %s", (path, label) => {
  nav.pathname = path;
  render(<PortalNav />, inTheme);
  expect(screen.getByRole("button", { name: new RegExp(`^${label}`) })).toBeInTheDocument();
  // One switcher instead of a row of portal links.
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
it("lists every portal in one menu and marks the current one", async () => {
  nav.pathname = "/seller";
  render(<PortalNav />, inTheme);
  const trigger = screen.getByRole("button", { name: /^Seller portal/ });
  fireEvent.keyDown(trigger, { key: "Enter" });
  const items = await screen.findAllByRole("menuitem");
  expect(items.map((item) => item.textContent)).toEqual([
    "Operations",
    "Customer",
    "Seller",
    "Driver",
  ]);
  expect(items[2]).toHaveAttribute("aria-current", "page");
  expect(items[0]).toHaveAttribute("href", "/overview");
});
