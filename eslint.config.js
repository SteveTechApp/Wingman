import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";

// jsx-a11y's recommended preset ships every rule at "error". Downgrade to
// "warn" so adopting it surfaces the existing accessibility backlog without
// turning `npm run lint` into a hard failure on rules the codebase hasn't
// been audited against yet.
const jsxA11yRecommendedRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, value]) => {
    if (value === "off" || (Array.isArray(value) && value[0] === "off")) {
      return [rule, value];
    }

    return [rule, Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn"];
  }),
);

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "_*/**",
      "_release/**"
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-undef": "off",
      "no-empty": "off",
      "no-extra-boolean-cast": "off",
      "no-useless-escape": "warn",
      "no-irregular-whitespace": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^React$|^_",
        },
      ],
    },
  },

  {
    // .cjs is CommonJS by file-extension convention (Node treats it as such
    // regardless of "type": "module" in package.json) - require() is the
    // correct, intended syntax there, not a lint violation to fix.
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin,
    },

    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },

    settings: {
      react: { version: "detect" },
    },

    rules: {
      "react/react-in-jsx-scope": "off",

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^React$|^_"
        }
      ],

      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": "off",
      "import/order": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-irregular-whitespace": "warn",
      "no-case-declarations": "warn",
      ...jsxA11yRecommendedRules
    }
  }
];
