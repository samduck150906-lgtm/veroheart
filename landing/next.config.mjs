import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  outputFileTracingRoot: currentDirectory,
};

export default nextConfig;
