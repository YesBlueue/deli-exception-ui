import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

// Design-system guardrails: styling must come from theme tokens and shared patterns.
// Arbitrary values ("text-[11px]", "max-h-[90vh]") and Tailwind palette colors ("text-red-500",
// "bg-white") bypass the theme; arbitrary variants such as "[&_svg]:size-4" are still allowed.
const ARBITRARY_VALUE = "-\\[[^\\]]+\\]";
const PALETTE_COLOR =
  "\\b(?:bg|text|border|ring|fill|stroke|outline|divide|from|via|to|shadow|decoration|accent|caret|placeholder)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}|white|black)\\b";
const CLASS_STRINGS = [
  "JSXAttribute[name.name='className'] Literal",
  "JSXAttribute[name.name='className'] TemplateElement",
  "Property[key.name='className'] > Literal",
];
const classRules = (pattern, message) =>
  CLASS_STRINGS.map((target) => ({
    selector: `${target}[${target.endsWith("TemplateElement") ? "value.raw" : "value"}=/${pattern}/]`,
    message,
  }));
const designSystemRestrictions = [
  ...classRules(ARBITRARY_VALUE, "Use a theme token, a standard Tailwind step or a shared pattern instead of an arbitrary value (see /design-system)."),
  ...classRules(PALETTE_COLOR, "Use a theme color token (text-critical, bg-muted, text-primary…) instead of a Tailwind palette color (see /design-system)."),
  {
    selector: "JSXAttribute[name.name='style'] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
    message: "Use a theme color token (var(--…)) instead of a hex color.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      // Complaint photos are user-supplied data URLs that next/image cannot optimise.
      "@next/next/no-img-element": "off",
      // React Compiler rules from eslint-config-next flag effect patterns carried over unchanged from the
      // pre-migration code; kept visible as warnings rather than rewritten during the framework move.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // App code and shared patterns; the vendored shadcn primitives in src/shared/ui are exempt.
    files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}", "src/shared/ui/patterns/**/*.{ts,tsx}"],
    ignores: ["src/app/global-error.tsx"],
    rules: { "no-restricted-syntax": ["error", ...designSystemRestrictions] },
  },
  eslintPluginPrettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
]);
