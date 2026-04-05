import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

/** `app/globals.css` からの `@import "tw-animate-css"` を `node_modules` に解決しやすくする */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: frontendRoot,
    },
  },
};

export default config;
