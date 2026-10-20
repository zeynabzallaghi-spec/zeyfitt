/**
 * تایپ‌های کلاینت مرحله ۱۵ — آینه‌ای از پاسخ‌های API بدون هیچ منطق مجوزی.
 * هیچ تصمیمی (نقش، اشتراک، وضعیت) روی کلاینت گرفته نمی‌شود؛ فقط نمایش.
 */

export interface PublicCoachClient {
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  specializations: string[];
  certifications: string[];
  experienceYears: number | null;
  cooperationTypes: string[];
  /** تعرفه عمومی — null یعنی «تعرفه ثبت نشده» (هرگز صفر تفسیر نمیشود) */
  tariff: {
    privatePriceIrr: number | null;
    privatePriceUsd: number | null;
    semiPrivatePriceIrr: number | null;
    semiPrivatePriceUsd: number | null;
  } | null;
}

export interface SubscriptionClient {
  tier: string;
  status: string;
  source: string;
  note: string | null;
  startsAt: string;
  expiresAt: string | null;
  premium: boolean;
  expired: boolean;
}

export interface ConnectionItemClient {
  id: string;
  status: string;
  cooperationType: string;
  message: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  coach: {
    userId: string;
    displayName: string;
    headline: string | null;
    available: boolean;
  };
}

export interface CoachRequestItemClient {
  id: string;
  status: string;
  cooperationType: string;
  message: string | null;
  requestedAt: string;
  decidedAt: string | null;
  student: {
    userId: string;
    displayName: string;
  };
}

export interface CoachStudentItemClient {
  connectionId: string;
  cooperationType: string;
  activeSince: string;
  student: {
    userId: string;
    displayName: string;
  };
}

export interface CoachProfileClient extends PublicCoachClient {
  verified: boolean;
  published: boolean;
  canPublish: boolean;
}

export interface ApplicationClient {
  status: string;
  decidedAt: string | null;
  createdAt: string;
}
