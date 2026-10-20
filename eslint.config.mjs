import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

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
  eslintPluginPrettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
]);
