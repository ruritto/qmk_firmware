import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma のエンジンをサーバーバンドルに含めない
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
};

export default nextConfig;
