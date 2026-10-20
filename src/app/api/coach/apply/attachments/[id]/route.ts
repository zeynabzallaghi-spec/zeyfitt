import { NextResponse } from "next/server";
import { CoachingError } from "@/lib/coaching/constants";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { db } from "@/lib/db";
import { USER_ROLES } from "@/lib/coaching/constants";
import {
  deleteAttachmentFile,
  readAttachmentFile,
} from "@/lib/coaching/attachments";
import { logAdminAction } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/apply/attachments/[id] — دریافت محتوای سند.
 * فقط مالک درخواست یا ادمین (نقش تازه از دیتابیس)؛ برای بقیه و ناموجود
 * پاسخ 404 یکسان است — بدون افشای وجود (ضد IDOR). فایل با Content-Type
 * ذخیره‌شده inline نمایش داده میشود؛ نام نمایشی در Content-Disposition
 * امن انکود میشود و هیچ مسیری از آن نمیسازد.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const row = await db.coachApplicationAttachment.findUnique({
      where: { id },
      select: {
        mimeType: true,
        fileName: true,
        sizeBytes: true,
        storagePath: true,
        application: { select: { userId: true } },
      },
    });
    if (!row) throw new CoachingError(404, "ATTACHMENT_NOT_FOUND");
    const isOwner = row.application.userId === user.id;
    if (!isOwner && user.role !== USER_ROLES.ADMIN) {
      // همان پاسخ ناموجود — بدون افشای وجود سند دیگران
      throw new CoachingError(404, "ATTACHMENT_NOT_FOUND");
    }

    const bytes = await readAttachmentFile(row.storagePath);
    const safeName = encodeURIComponent(row.fileName || "attachment");
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(bytes.byteLength),
        // inline برای نمایش تصویر/PDF در مرورگر؛ filename فقط نمایشی است
        "Content-Disposition": `inline; filename*=UTF-8''${safeName}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/**
 * DELETE /api/coach/apply/attachments/[id] — حذف سند.
 *  - مالک: فقط وقتی درخواست هنوز pending یا rejected است (قابل ویرایش).
 *  - ادمین: هر زمان — با ثبت در AdminActionLog (حذف محتوای نامناسب).
 *  - پس از تأیید/تاریخچه، مالک حق حذف ندارد؛ سند برای رسیدگی ادمین حفظ میشود.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const row = await db.coachApplicationAttachment.findUnique({
      where: { id },
      select: {
        storagePath: true,
        title: true,
        application: {
          select: { userId: true, status: true },
        },
      },
    });
    if (!row) throw new CoachingError(404, "ATTACHMENT_NOT_FOUND");

    const isOwner = row.application.userId === user.id;
    const isAdmin = user.role === USER_ROLES.ADMIN;

    if (isAdmin) {
      await deleteAttachmentFile(row.storagePath);
      await db.coachApplicationAttachment.delete({ where: { id } });
      await logAdminAction(
        user.id,
        "delete-coach-application-attachment",
        "coach-application-attachment",
        id,
        { title: row.title }
      );
      return NextResponse.json({ deleted: true });
    }

    if (!isOwner) {
      // همان پاسخ ناموجود — بدون افشای وجود
      throw new CoachingError(404, "ATTACHMENT_NOT_FOUND");
    }
    if (row.application.status !== "pending" && row.application.status !== "rejected") {
      throw new CoachingError(409, "APPLICATION_NOT_EDITABLE");
    }
    await deleteAttachmentFile(row.storagePath);
    await db.coachApplicationAttachment.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
