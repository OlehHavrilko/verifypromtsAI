import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Deno edge functions ship their own runtime and are not part of the Vite
    // TypeScript project; dist is generated output.
    ignores: ["dist", "supabase/functions/**", "public/**"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // The app intentionally talks to loosely typed Supabase payloads.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // shadcn/ui primitives are generated code.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["*.config.{ts,js}", "scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
