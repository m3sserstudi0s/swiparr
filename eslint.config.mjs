import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pre-existing backlog: lint could not run at all before (wrong eslint-config-next version +
  // next lint removed in Next 16). `any` and exhaustive-deps are warned, not failed, so the gate
  // catches new breakage without demanding a 300-edit rewrite in the same change.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // React Compiler-era rules, added by eslint-config-next 16. Pre-existing code does not satisfy
      // them yet; migrating the deck/session components is its own task, not a design-system one.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
