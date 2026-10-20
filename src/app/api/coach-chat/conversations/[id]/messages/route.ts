import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { listMessages, sendMessage } from "@/lib/coaching/chat";
import { messagesQuerySchema, sendMessageSchema } from "@/lib/coaching/chat-schemas";
import {
  CHAT_ATTACHMENT_LIMITS,
  CHAT_ATTACHMENT_MIME_ALLOWED,
  CoachingError,
} from "@/lib/coaching/constants";
import {
  deleteChatAttachmentFile,
  resolveChatAttachmentMime,
  saveChatAttachmentFile,
} from "@/lib/coaching/media-storage";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach-chat/conversations/[id]/messages — پیام‌های یک مکالمه مجاز.
 *
 * فقط طرف مکالمه (غیرطرف و ناموجود: 404 یکسان). صفحه‌بندی با مکان‌یاب
 * پایدار seq: بدون پارامتر = آخرین صفحه؛ before = صفحه قدیمی‌تر؛ after =
 * فقط پیام‌های جدیدتر (polling). واکشی موفق، پیام‌های خوانده‌نشده طرف
 * مقابل را سمت سرور خوانده‌شده ثبت میکند (تنها مسیر تغییر readAt).
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const url = new URL(request.url);
    const rawQuery = {
      before: url.searchParams.get("before") ?? undefined,
      after: url.searchParams.get("after") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };
    const query = parseWithSchema(messagesQuerySchema, rawQuery);
    const page = await listMessages(id, user, query);
    return NextResponse.json(page);
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * POST /api/coach-chat/conversations/[id]/messages — ارسال پیام متنی.
 *
 * فقط محتوای پیام از بدنه پذیرفته میشود؛ senderId/readAt/زمان و هر فیلد
 * دیگری که کلاینت بفرستد حذف میشود و senderId همیشه از نشست سرور
 * استخراج میگردد. ماتریس کامل مجوز، نرخ‌سنجی دیتابیسی و نوشتن seq در
 * تراکنش در لایه سرویس انجام میشود (401/403/404/422/429 معنادار).
 */
/**
 * POST /api/coach-chat/conversations/[id]/messages — ارسال پیام (متن و/یا فایل).
 *
 * دو قالب:
 *  - application/json: { content } — پیام متنی (رفتار قبلی عیناً حفظ میشود)
 *  - multipart/form-data: content (اختیاری وقتی فایل هست) + files[] —
 *    سقف مجموع ۲۰ مگابایت و حداکثر ۳ فایل، سمت سرور؛ نوع فایل با امضای
 *    بایت‌ها راستی‌آزمایی میشود (پسوند/نوع اعلامی به‌تنهایی کافی نیست).
 * فایل‌ها پیش از تراکنش روی دیسک امن نوشته می‌شوند؛ شکست بعدی → پاک‌سازی.
 * senderId/readAt/زمان همیشه از نشست سرور؛ هیچ فیلد مجوزی از کلاینت نیست.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData().catch(() => {
        throw new CoachingError(400, "VALIDATION");
      });
      const rawContent = form.get("content");
      const contentStr = typeof rawContent === "string" ? rawContent : "";
      const files = form.getAll("files").filter((v): v is File => v instanceof File);
      if (files.length > CHAT_ATTACHMENT_LIMITS.MAX_FILES) {
        throw new CoachingError(422, "TOO_MANY_FILES");
      }
      let total = 0;
      for (const f of files) {
        total += f.size;
      }
      if (total > CHAT_ATTACHMENT_LIMITS.TOTAL_MAX_BYTES) {
        throw new CoachingError(413, "ATTACHMENT_TOO_LARGE");
      }
      if (contentStr.trim().length === 0 && files.length === 0) {
        throw new CoachingError(400, "VALIDATION");
      }
      // اعتبارسنجی متن با همان شِمای متنی (خالی مجاز وقتی فایل داریم)
      const content =
        contentStr.trim().length > 0
          ? parseWithSchema(sendMessageSchema, { content: contentStr }).content
          : "";

      const prepared: {
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        storagePath: string;
      }[] = [];
      try {
        for (const f of files) {
          if (f.size > CHAT_ATTACHMENT_LIMITS.TOTAL_MAX_BYTES) {
            throw new CoachingError(413, "ATTACHMENT_TOO_LARGE");
          }
          if (!CHAT_ATTACHMENT_MIME_ALLOWED.has(f.type)) {
            throw new CoachingError(415, "FILE_TYPE_NOT_ALLOWED");
          }
          const bytes = new Uint8Array(await f.arrayBuffer());
          const verified = resolveChatAttachmentMime(f.type, bytes);
          if (!verified) {
            throw new CoachingError(415, "FILE_TYPE_NOT_ALLOWED");
          }
          if (bytes.byteLength === 0) {
            throw new CoachingError(422, "FILE_EMPTY");
          }
          const name =
            f.name.replace(/[\\/\u0000-\u001f\u007f]/g, " ").trim().slice(0, CHAT_ATTACHMENT_LIMITS.FILE_NAME_MAX) || "file";
          const { storagePath } = await saveChatAttachmentFile(id, bytes);
          prepared.push({
            fileName: name,
            mimeType: verified,
            sizeBytes: bytes.byteLength,
            storagePath,
          });
        }
        const message = await sendMessage(id, user, content, prepared);
        return NextResponse.json({ message }, { status: 201 });
      } catch (error) {
        // شکست پس از نوشتن فایل — پاک‌سازی فایل‌های یتیم
        for (const p of prepared) {
          await deleteChatAttachmentFile(p.storagePath);
        }
        throw error;
      }
    }

    const body = await readJsonBody(request);
    const input = parseWithSchema(sendMessageSchema, body);
    const message = await sendMessage(id, user, input.content);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
