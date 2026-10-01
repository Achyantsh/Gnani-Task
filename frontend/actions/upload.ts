"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

interface PresignedUrlResponse {
  success: boolean;
  uploadUrl?: string;
  fileKey?: string;
  error?: string;
  statusCode: number
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  fileSize: number
): Promise<PresignedUrlResponse> {
  try {
    const MAX_SIZE = 1024 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return { success: false, error: "File size exceeds the 1GB limit.", statusCode: 401 };
    }

    if (!contentType.startsWith("audio/")) {
      return { success: false, error: "Only audio files are allowed.", statusCode: 401 };
    }

    let userId = "guest";
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        userId = user.id;
      }
    } catch {
      // Continue as guest if auth not initialized
    }

    if (userId == "guest"){
      return {
        success: false,
        uploadUrl: "",
        error: "User Not Authenticated",
        statusCode: 403
      }
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const fileKey = `audio/${userId}/${timestamp}-${uniqueId}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });

    return {
      success: true,
      uploadUrl,
      fileKey,
      statusCode: 200
    };
  } catch (err: unknown) {
    console.error("Error generating presigned URL:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to generate presigned upload URL.",
      statusCode: 401
    };
  }
}
