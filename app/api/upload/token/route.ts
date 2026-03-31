import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { validateMagicBytes } from "@/lib/validation/magicBytes";
import { limiters } from "@/lib/rateLimit";
import { z } from "zod";

const BUCKET = "study-files";
const ALLOWED_EXTENSIONS = ["edf", "edf+", "bdf", "zip"];

const uploadTokenSchema = z.object({
  file_ext: z.string().min(1),
  file_header_b64: z.string().optional(),
});

export const POST = withErrorHandler(
  requireAuth(["client", "agent", "admin"], { schema: uploadTokenSchema }, async (req, { user, adminClient, validatedData }) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const { allowed, headers } = await limiters.upload.check(`upload:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
    }

    const { file_ext, file_header_b64 } = validatedData!;
    const fileExt = file_ext.toLowerCase().replace(/^\./, "");

    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: "File extension not allowed" },
        { status: 400 },
      );
    }

    if (file_header_b64) {
      const headerBuffer = Buffer.from(file_header_b64, "base64");
      const magicResult = validateMagicBytes(headerBuffer, `file.${fileExt}`);
      if (!magicResult.valid) {
        return NextResponse.json(
          { error: `File validation failed: ${magicResult.reason}` },
          { status: 400 },
        );
      }
    }

    const objectPath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`;

    const { data, error } = await adminClient.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      console.error("[POST /api/upload/token]", error);
      return NextResponse.json(
        { error: "Unable to create upload token" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: data.token,
      path: objectPath,
    });
  })
);
