import { defineConfig, globalIgnores } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import prettierEslint from 'eslint-plugin-prettier'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/node_modules/",
    "**/lib/",
    "**/coverage/",
    "android/build/",
    "ios/build/",
    "example/android/build/",
    "example/ios/build/",
]), {
    extends: compat.extends("@react-native", "prettier"),
    plugins: {
        prettier: prettierEslint,
    },

    rules: {
        "prettier/prettier": ["error", {
            quoteProps: "consistent",
            singleQuote: true,
            tabWidth: 2,
            trailingComma: "es5",
            useTabs: false,
        }],
        "react-native/no-inline-styles": "off",
    },
}]);