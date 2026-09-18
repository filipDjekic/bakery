import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",

    ".agents/**",
    ".claude/**",
    ".cursor/**",
    ".devin/**",

    "migrations/snapshots/**",

    "src/prisma/contract.d.ts",
    'src/prisma/contract.json',
  ]),
]);

export default eslintConfig;
