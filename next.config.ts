import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained output for Docker — only the files needed to run
  // the server are included, which significantly reduces the image size.
  output: "standalone",
};

export default nextConfig;
