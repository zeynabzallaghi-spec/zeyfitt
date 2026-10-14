"use client";

import { create } from "zustand";

/** پیام‌های گفت‌وگوی دستیار — فقط در حافظه نشست، بدون ذخیره سمت سرور */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

/**
 * پاسخ وضعیت دستیار: در این مرحله مدل هوش مصنوعی متصل نیست و این پیام
 * صرفاً اطلاع‌رسانی شفاف است — نه پاسخ واقعی AI.
 */
export const ASSISTANT_STATUS_REPLY =
  "من در این نسخه به مدل هوش مصنوعی متصل نیستم و پاسخ واقعی تولید نمی‌کنم؛ اتصال امن از سمت سرور در مرحله ۹ انجام می‌شود. " +
  "تا آن زمان می‌توانید از داشبورد برای مشاهده وضعیت، از کتابخانه حرکات برای آشنایی با ساختار حرکات و از بخش پروفایل برای مدیریت اطلاعات واقعی حساب خود استفاده کنید.";

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  text: "سلام! من دستیار هوشمند مربی تناسب اندام هستم. در نسخه فعلی هنوز به مدل زبانی متصل نشده‌ام؛ می‌توانید سؤال نمونه انتخاب کنید تا ساختار گفت‌وگو را ببینید. پاسخ واقعی به سؤالات شما پس از اتصال مدل فعال می‌شود.",
};

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * پیش‌نویس پروفایل حذف شد — پروفایل اکنون با حساب کاربری واقعی در
 * پایگاه داده سرور ذخیره می‌شود (src/lib/profile.ts + /api/profile).
 */
interface FitnessState {
  chat: ChatMessage[];
  addUserMessage: (text: string) => void;
  addAssistantMessage: (text: string) => void;
}

export const useFitnessStore = create<FitnessState>((set) => ({
  chat: [INITIAL_ASSISTANT_MESSAGE],
  addUserMessage: (text) =>
    set((s) => ({ chat: [...s.chat, { id: makeId(), role: "user", text }] })),
  addAssistantMessage: (text) =>
    set((s) => ({ chat: [...s.chat, { id: makeId(), role: "assistant", text }] })),
}));
