/**
 * قرارداد واحد شناسه حرکت شخصی مربی — مرحله ۲۰ / بسته P0.
 *
 * پیش از این ماژول، نمایش شناسه حرکت شخصی در دو جا تعریف شده بود:
 * سرور (coach-exercises.ts) پیشوند «cex-» را برای ورودی برنامه‌ساز
 * انتظار داشت، اما انتخابگر UI شناسه را بدون پیشوند منتشر میکرد — نتیجه:
 * درج حرکت شخصی از برنامه‌ساز بی‌صدا شکست میخورد. از این پس **تنها منبع
 * حقیقتِ قرارداد همین ماژول است** — هم کلاینت و هم سرور از اینجا import
 * میکنند؛ هیچ محل دیگری پیشوند را به‌صورت رشته خام تکرار نمیکند.
 *
 * قواعد قرارداد (تغییرناپذیر — با قرارداد API موجود فاز ۱۹.۶ سازگار):
 *  - قالب سیم (کلاینت → سرور در ورودی برنامه‌ساز): حرکت شخصی با پیشوند
 *    «cex-» ارسال میشود؛ حرکت بانک عمومی شناسه خام.
 *  - قالب ذخیره (سرور → DB → خروجی API): شناسه خام + فیلد
 *    source: "personal" — پیشوند هرگز در DB ذخیره نمیشود.
 *  - تبدیل‌ها idempotent‌اند: پیشوند هرگز دوبار اضافه نمیشود و شناسه
 *    بانک عمومی هرگز دست نمیخورد.
 *
 * این ماژول عمداً هیچ وابستگی‌ای ندارد (نه Prisma، نه React) تا هم در
 * Route Handlerها و هم در کامپوننت‌های کلاینت امن باشد.
 */

/** پیشوند قراردادی حرکت شخصی در قالب سیم برنامه‌ساز — مقدار تغییرناپذیر */
export const PERSONAL_EXERCISE_PREFIX = "cex-";

/** منبع حرکت در محتوای ذخیره‌شده برنامه — همان واژگان سرور */
export type PlanExerciseSource = "public" | "personal";

/** آیا این شناسه در قالب سیم، حرکت شخصی است؟ */
export function isPersonalExerciseId(id: string): boolean {
  return id.startsWith(PERSONAL_EXERCISE_PREFIX);
}

/**
 * افزودن پیشوند قراردادی — idempotent: شناسه پیشونددار دست‌نخورده
 * برمی‌گردد تا پیشوند هرگز دوبار اضافه نشود.
 */
export function withPersonalPrefix(id: string): string {
  return id.startsWith(PERSONAL_EXERCISE_PREFIX) ? id : PERSONAL_EXERCISE_PREFIX + id;
}

/**
 * حذف پیشوند قراردادی — اگر پیشوند نباشد شناسه عیناً برمی‌گردد؛
 * شناسه بانک عمومی هرگز تغییر نمیکند.
 */
export function stripPersonalPrefix(id: string): string {
  return id.startsWith(PERSONAL_EXERCISE_PREFIX) ? id.slice(PERSONAL_EXERCISE_PREFIX.length) : id;
}

/**
 * سطر ذخیره‌شده محتوای برنامه (خروجی API) → شناسه قالب سیم برای
 * بازارسال در ویرایش. قاعده رسمی بازسازی فرم برنامه‌ساز:
 *  - source = "personal" → پیشوند (idempotent — برای داده قدیمی که
 *    به هر دلیل پیشوند دارد دوبار اضافه نمیشود)
 *  - غیر آن → شناسه عیناً (بانک عمومی و داده بدون source — پیش از ۱۹.۶
 *    حرکت شخصی وجود نداشت، پس نبود source یعنی public)
 */
export function storedExerciseIdToWire(row: { exerciseId: string; source?: string }): string {
  return row.source === "personal" ? withPersonalPrefix(row.exerciseId) : row.exerciseId;
}
