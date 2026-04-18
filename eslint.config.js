import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "_*/**",
      "_archive/**",
      "_release/**",
      "_RESCUE/**",
      "_RECOVERY/**",
      "_WORK/**",
      "_STYLE_AUTHORITY_BACKUP/**",
      "_AUTH_BACKUP/**",
      "_COMPARE_BACKUP/**",
      "_COMPARE_MIGRATION_BACKUP/**"
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
      "no-case-declarations": "warn"
    }
  }
];
