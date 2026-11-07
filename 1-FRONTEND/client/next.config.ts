import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: ["@auto/i18n", "@auto/supabase", "@auto/types", "@auto/ui", "@auto/validation"],
};

export default nextConfig;
