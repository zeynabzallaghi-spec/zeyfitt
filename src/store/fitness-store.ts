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
  "تا آن زمان می‌توانید از داشبورد برای مشاهده وضعیت، از کتابخانه حرکات برای آشنایی با ساختار حرکات و از بخش پروفایل برای پیش‌نمایش فرم اطلاعات استفاده کنید.";

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  text: "سلام! من دستیار هوشمند مربی تناسب اندام هستم. در نسخه فعلی هنوز به مدل زبانی متصل نشده‌ام؛ می‌توانید سؤال نمونه انتخاب کنید تا ساختار گفت‌وگو را ببینید. پاسخ واقعی به سؤالات شما پس از اتصال مدل در مرحله ۹ فعال می‌شود.",
};

/** پیش‌نویس پروفایل — تعاملی ولی فقط درون نشست؛ ذخیره دائمی در مرحله ۲ */
export interface ProfileDraft {
  displayName: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  bodyFat: string;
  goal: string;
  level: string;
  daysPerWeek: string;
  sessionMinutes: string;
  equipment: string[];
  limitations: string[];
  limitationNotes: string;
  diet: string;
  allergies: string[];
  saved: boolean;
}

export const INITIAL_PROFILE_DRAFT: ProfileDraft = {
  displayName: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  bodyFat: "",
  goal: "",
  level: "",
  daysPerWeek: "",
  sessionMinutes: "",
  equipment: [],
  limitations: [],
  limitationNotes: "",
  diet: "",
  allergies: [],
  saved: false,
};

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type ArrayFieldKey = "equipment" | "limitations" | "allergies";

interface FitnessState {
  chat: ChatMessage[];
  addUserMessage: (text: string) => void;
  addAssistantMessage: (text: string) => void;
  profileDraft: ProfileDraft;
  setProfileField: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
  toggleProfileArrayField: (key: ArrayFieldKey, value: string) => void;
  saveProfileDraft: () => void;
  resetProfileDraft: () => void;
}

export const useFitnessStore = create<FitnessState>((set) => ({
  chat: [INITIAL_ASSISTANT_MESSAGE],
  addUserMessage: (text) =>
    set((s) => ({ chat: [...s.chat, { id: makeId(), role: "user", text }] })),
  addAssistantMessage: (text) =>
    set((s) => ({ chat: [...s.chat, { id: makeId(), role: "assistant", text }] })),
  profileDraft: INITIAL_PROFILE_DRAFT,
  setProfileField: (key, value) =>
    set((s) => ({ profileDraft: { ...s.profileDraft, [key]: value } })),
  toggleProfileArrayField: (key, value) =>
    set((s) => {
      const list = s.profileDraft[key];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { profileDraft: { ...s.profileDraft, [key]: next, saved: false } };
    }),
  saveProfileDraft: () =>
    set((s) => ({ profileDraft: { ...s.profileDraft, saved: true } })),
  resetProfileDraft: () => set({ profileDraft: { ...INITIAL_PROFILE_DRAFT } }),
}));
