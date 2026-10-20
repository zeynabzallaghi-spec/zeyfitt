import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { db } from "@/lib/db";
import { CoachingError } from "@/lib/coaching/constants";
import { readChatAttachmentFile } from "@/lib/coaching/media-storage";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach-chat/attachments/[id] — بایت‌های پیوست پیام.
 * فقط اعضای همان مکالمه؛ «غیرعضو» و «ناموجود» هر دو 404 (ضد IDOR).
 * Content-Disposition امن (نام پاک‌شده)، no-store و nosniff.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const media = await db.coachMessageAttachment.findUnique({
      where: { id },
      include: {
        message: {
          select: {
            conversationId: true,
            conversation: { select: { studentId: true, coachId: true } },
          },
        },
      },
    });
    if (
      !media ||
      (media.message.conversation.studentId !== user.id &&
        media.message.conversation.coachId !== user.id)
    ) {
      throw new CoachingError(404, "ATTACHMENT_NOT_FOUND");
    }
    const bytes = await readChatAttachmentFile(media.storagePath);
    const safeName = media.fileName.replace(/["\\\r\n]/g, " ").trim() || "file";
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
