import { NextResponse } from "next/server";
import { z } from "zod";
import { CoachingError } from "@/lib/coaching/constants";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { db } from "@/lib/db";
import {
  ATTACHMENT_LIMITS,
  USER_ROLES,
} from "@/lib/coaching/constants";
import {
  resolveVerifiedMime,
  sanitizeDisplayName,
  saveAttachmentFile,
} from "@/lib/coaching/attachments";

/**
 * POST /api/coach/apply/attachments — بارگذاری سند با عنوان برای درخواست
 * مربی‌گری خود کاربر (multipart/form-data).
 *
 * قواعد:
 *  - فقط STUDENT (مربی/ادمین درخواست ندارند — همان قاعده POST /api/coach/apply).
 *  - ابتدا فرم درخواست باید ثبت شده باشد (رکورد درخواست وجود داشته باشد).
 *  - بارگذاری فقط وقتی درخواست pending یا rejected است — پس از تصمیم نهایی
 *    هیچ تغییری روی مدارک مجاز نیست (تاریخچه حفظ میشود).
 *  - سقف تعداد و اندازه و انواع فایل در لایه سرور؛ نوع واقعی بایت‌ها با
 *    امضا (magic bytes) بررسی میشود — نوع اعلامی کلاینت به‌تنهایی قابل
 *    اعتماد نیست.
 *  - خروجی فقط metadata امن است؛ مسیر دیسک هرگز به کلاینت نمیرود.
 */

const attachmentTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(ATTACHMENT_LIMITS.TITLE_MAX);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== USER_ROLES.STUDENT) {
      return NextResponse.json({ error: "ROLE_NOT_ALLOWED" }, { status: 403 });
    }

    const application = await db.coachApplication.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        _count: { select: { attachments: true } },
      },
    });
    if (!application) {
      throw new CoachingError(404, "NO_APPLICATION");
    }
    if (application.status !== "pending" && application.status !== "rejected") {
      throw new CoachingError(409, "APPLICATION_NOT_EDITABLE");
    }
    if (application._count.attachments >= ATTACHMENT_LIMITS.MAX_PER_APPLICATION) {
      throw new CoachingError(409, "ATTACHMENT_LIMIT");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new CoachingError(400, "VALIDATION");
    }

    const titleParsed = attachmentTitleSchema.safeParse(form.get("title"));
    if (!titleParsed.success) {
      throw new CoachingError(400, "ATTACHMENT_TITLE_INVALID");
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      throw new CoachingError(400, "FILE_REQUIRED");
    }
    if (file.size > ATTACHMENT_LIMITS.SIZE_MAX_BYTES) {
      throw new CoachingError(413, "FILE_TOO_LARGE");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // بررسی اندازه واقعی بایت‌ها — file.size اعلامی کلاینت است
    if (bytes.byteLength === 0) {
      throw new CoachingError(400, "FILE_REQUIRED");
    }
    if (bytes.byteLength > ATTACHMENT_LIMITS.SIZE_MAX_BYTES) {
      throw new CoachingError(413, "FILE_TOO_LARGE");
    }
    const mime = resolveVerifiedMime(file.type, bytes);
    if (!mime) {
      throw new CoachingError(400, "FILE_TYPE_NOT_ALLOWED");
    }

    const displayName = sanitizeDisplayName(file.name);
    const { storagePath } = await saveAttachmentFile(application.id, bytes);

    const row = await db.coachApplicationAttachment.create({
      data: {
        applicationId: application.id,
        title: titleParsed.data,
        fileName: displayName,
        mimeType: mime,
        sizeBytes: bytes.byteLength,
        storagePath,
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        attachment: {
          id: row.id,
          title: row.title,
          fileName: row.fileName,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
