import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "@typescript-eslint/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pre-existing backlog: `next lint` was removed in Next 16, so this config is the first one the
  // app has actually run. `any` and the React Compiler-era hook rules are warned, not failed, so
  // the gate catches new breakage without demanding a 300-edit rewrite in the same change.
  // The plugins are registered here because a flat-config object cannot set a rule for a plugin
  // that is not in its own `plugins` map — ESLint 9 fails the whole run otherwise.
  {
    plugins: {
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  // Build scripts are CommonJS: `require` is the language there, not a mistake.
  {
    files: ["scripts/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
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
