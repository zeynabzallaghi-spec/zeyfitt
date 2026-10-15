/**
 * نقطه دسترسی واحد موتور برنامه‌سازی — خالص، بدون وابستگی به دیتابیس یا
 * درخواست HTTP؛ در تست خودکار و API بدون تفاوت کار می‌کند.
 */

export * from "./types";
export * from "./schema";
export * from "./presets";
export { generatePlan, PlanGenerationError, isCategoryKnown } from "./engine";
