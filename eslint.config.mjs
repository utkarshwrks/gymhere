import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Phase 6: service keys may only be read through the credential resolver
    // (or the env module). Reading them directly anywhere else is a build error.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Dot access: env.RAZORPAY_KEY_ID / process.env.RAZORPAY_KEY_ID
          selector:
            "MemberExpression[property.name=/^(RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|RESEND_API_KEY|UPLOADTHING_TOKEN)$/]",
          message:
            "Service keys must be resolved via lib/credentials/resolver (resolveCredentials / getPlatformValues), not read directly.",
        },
        {
          // Computed access: env["RAZORPAY_KEY_ID"]
          selector:
            "MemberExpression[computed=true][property.value=/^(RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|RESEND_API_KEY|UPLOADTHING_TOKEN)$/]",
          message:
            "Service keys must be resolved via lib/credentials/resolver, not read directly.",
        },
      ],
    },
  },
  {
    // The resolver and the env module are the only sanctioned readers.
    files: ["src/lib/credentials/**", "src/lib/env.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**"],
  },
];

export default eslintConfig;
