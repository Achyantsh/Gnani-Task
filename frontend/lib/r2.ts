import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
  throw new Error("Missing CLOUDFLARE_R2_ACCOUNT_ID in environment variables");
}

if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
  throw new Error("Missing CLOUDFLARE_R2_ACCESS_KEY_ID in environment variables");
}

if (!process.env.CLOUDFLARE_R2_SECRET_KEY) {
  throw new Error("Missing CLOUDFLARE_R2_SECRET_KEY in environment variables");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
  },
});

export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "gnani-audio";
