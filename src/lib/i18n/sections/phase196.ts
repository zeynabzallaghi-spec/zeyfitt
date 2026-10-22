/**
 * دیکشنری مرحله ۱۹.۶ — اعلان‌ها، اطلاعات بانکی، تعرفه/پرداخت، حرکات شخصی
 * مربی، اطلاعات تکمیلی دانشجو و مسدودسازی پیام‌رسان. FA/EN متقارن و کامل
 * (تست check-i18n تعادل کلیدها را بررسی می‌کند).
 */

import type { Locale } from "../shared";

export interface Phase196Strings {
  // مرکز اعلان‌ها
  notificationsTitle: string;
  notificationsEmpty: string;
  markAllRead: string;
  unreadCountLabel: (n: number) => string;
  notifMessageNew: string;
  notifConnectionRequest: string;
  notifConnectionApproved: string;
  notifConnectionRejected: string;
  notifConnectionCancelled: string;
  notifCoachApplicationApproved: string;
  notifCoachApplicationRejected: string;
  notifPremiumApproved: string;
  notifPremiumRejected: string;
  notifSupportReply: string;
  notifSupportTicketNew: string;
  notifPlanDelivered: string;
  notifPlanDeliveredNutrition: string;
  notifPaymentRequest: string;
  notifPaymentConfirmed: string;
  notifPaymentDeclined: string;
  notifPaymentCancelled: string;
  notifUnknownType: string;
  // اطلاعات بانکی
  bankingSectionTitle: string;
  bankingSectionNote: string;
  bankingPrivacyNote: string;
  accountHolderLabel: string;
  bankNameLabel: string;
  accountNumberLabel: string;
  cardNumberLabel: string;
  shebaLabel: string;
  bankingNoteLabel: string;
  bankingSave: string;
  bankingSaved: string;
  bankingSavedNote: string;
  bankingInvalidCard: string;
  bankingInvalidSheba: string;
  // تعرفه
  tariffSectionTitle: string;
  tariffSectionNote: string;
  tariffPrivate: string;
  tariffSemiPrivate: string;
  tariffIrr: string;
  tariffUsd: string;
  tariffUnset: string;
  tariffSave: string;
  tariffSaved: string;
  // درخواست پرداخت
  paymentsSectionTitle: string;
  paymentsEmpty: string;
  paymentCreate: string;
  paymentStatusLabel: string;
  paymentStatusPending: string;
  paymentStatusConfirmed: string;
  paymentStatusDeclined: string;
  paymentStatusCancelled: string;
  paymentAwaitingPayment: string;
  paymentStudentLabel: string;
  paymentCoachLabel: string;
  paymentServiceLabel: string;
  paymentAmountLabel: string;
  paymentDescriptionLabel: string;
  paymentLinkLabel: string;
  paymentLinkPlaceholder: string;
  paymentConfirmTitle: string;
  paymentConfirmNote: string;
  paymentConfirm: string;
  paymentDecline: string;
  paymentCancel: string;
  paymentOpenLink: string;
  paymentLinkLockedNote: string;
  paymentLinkNote: string;
  paymentCreated: string;
  paymentCancelled: string;
  paymentConfirmedNote: string;
  paymentDeclinedNote: string;
  // حرکات شخصی
  exercisesSectionTitle: string;
  exercisesSectionNote: string;
  exercisesEmpty: string;
  exerciseCreate: string;
  exerciseEdit: string;
  exerciseDelete: string;
  exerciseDeleteConfirm: string;
  exerciseNameFa: string;
  exerciseNameEn: string;
  exerciseCategory: string;
  exerciseEquipment: string;
  exercisePrimaryMuscles: string;
  exerciseSecondaryMuscles: string;
  exerciseDescription: string;
  exerciseTips: string;
  exerciseMedia: string;
  exerciseMediaUpload: string;
  // P2 (R2.2) — پخش ویدئوی حرکت شخصی
  personalVideoPlay: string;
  personalVideoPlayAria: (name: string) => string;
  exerciseMediaEmpty: string;
  exerciseMediaImageNote: string;
  exerciseMediaVideoNote: string;
  exerciseSaved: string;
  exerciseDeleted: string;
  exerciseSourcePersonal: string;
  exerciseSourcePublic: string;
  exercisePersonalBadge: string;
  // مرحله ۲۰/P1 — جست‌وجوی کتابخانه شخصی، سقف و ذخیره از بانک عمومی
  librarySearchPlaceholder: string;
  librarySearchAria: string;
  librarySearchClear: string;
  libraryNoResults: string;
  libraryFilterCategory: string;
  libraryFilterMuscle: string;
  libraryFilterAll: string;
  libraryCapBadge: (count: number, cap: number) => string;
  libraryCapBadgeAria: (count: number, cap: number) => string;
  saveToLibrary: string;
  saveToLibrarySaved: string;
  saveToLibraryAria: (name: string) => string;
  saveToLibraryBusyAria: string;
  // اطلاعات تکمیلی دانشجو
  studentDetailTitle: string;
  studentDetailProfile: string;
  studentDetailPlans: string;
  studentDetailProgress: string;
  studentDetailNote: string;
  studentDetailNotePlaceholder: string;
  studentDetailNoteSave: string;
  studentDetailNoteSaved: string;
  studentDetailNotePrivacy: string;
  studentDetailServiceType: string;
  studentDetailSessions: (n: number) => string;
  studentDetailLastSession: string;
  studentDetailNoPlans: string;
  studentDetailChat: string;
  studentFilterAll: string;
  studentFilterPrivate: string;
  studentFilterSemiPrivate: string;
  studentsSearchPlaceholder: string;
  studentsEmpty: string;
  studentInfoButton: string;
  // مسدودسازی پیام‌رسان
  chatBlockAction: string;
  chatUnblockAction: string;
  chatBlockedBanner: string;
  chatBlockedMeBanner: string;
  chatBlocksTitle: string;
  chatBlocksEmpty: string;
  // گفت‌وگوی اولیه
  chatPreApprovalLabel: string;
  chatPreApprovalButton: string;
  // پروفایل دانشجو از چت
  chatViewProfile: string;
  chatStudentProfileTitle: string;
  chatProfileLoadError: string;
  chatBackToConversation: string;
  // فرم برنامه — بازطراحی
  planFormSource: string;
  planFormSourcePublic: string;
  planFormSourcePersonal: string;
  planFormPersonalEmpty: string;
  planFormSavingState: string;
  planFormAssignNote: string;
  planFormNoWeightFieldNote: string;
}

const fa: Phase196Strings = {
  notificationsTitle: "اعلان‌ها",
  notificationsEmpty: "هنوز اعلانی ندارید؛ رویدادهای مهم حساب اینجا نمایش داده میشوند.",
  markAllRead: "خواندن همه",
  unreadCountLabel: (n) => `${localeNumberFa(n)} اعلان خواندهنشده`,
  notifMessageNew: "پیام جدید دریافت شد",
  notifConnectionRequest: "درخواست ارتباط جدیدی ثبت شد",
  notifConnectionApproved: "درخواست ارتباط شما تأیید شد",
  notifConnectionRejected: "درخواست ارتباط شما رد شد",
  notifConnectionCancelled: "دانشجو درخواست را لغو کرد",
  notifCoachApplicationApproved: "درخواست مربیگری شما تأیید شد",
  notifCoachApplicationRejected: "درخواست مربیگری شما رد شد",
  notifPremiumApproved: "درخواست ارتقای حساب شما تأیید شد",
  notifPremiumRejected: "درخواست ارتقای حساب شما رد شد",
  notifSupportReply: "پاسخ جدیدی از پشتیبانی دریافت کردید",
  notifSupportTicketNew: "تیکت پشتیبانی جدیدی ثبت شده است",
  notifPlanDelivered: "برنامه تمرینی جدیدی برای شما ارسال شد",
  notifPlanDeliveredNutrition: "برنامه غذایی جدیدی برای شما ارسال شد",
  notifPaymentRequest: "درخواست پرداخت جدیدی برای شما ثبت شد",
  notifPaymentConfirmed: "دانشجو درخواست پرداخت را تأیید کرد",
  notifPaymentDeclined: "دانشجو درخواست پرداخت را رد کرد",
  notifPaymentCancelled: "درخواست پرداخت لغو شد",
  notifUnknownType: "رویداد حساب",
  bankingSectionTitle: "اطلاعات بانکی",
  bankingSectionNote: "اطلاعات پرداختی خود را برای استفاده در فرایندهای پرداخت وارد کنید.",
  bankingPrivacyNote: "این اطلاعات کاملاً خصوصی است و فقط خودتان میبینید؛ در هیچ پروفایل عمومی یا پنل دیگری نمایش داده نمیشود.",
  accountHolderLabel: "نام صاحب حساب",
  bankNameLabel: "نام بانک",
  accountNumberLabel: "شماره حساب",
  cardNumberLabel: "شماره کارت (۱۶ رقم)",
  shebaLabel: "شماره شبا (IR + ۲۴ رقم)",
  bankingNoteLabel: "یادداشت (اختیاری)",
  bankingSave: "ذخیره اطلاعات بانکی",
  bankingSaved: "اطلاعات بانکی ذخیره شد",
  bankingSavedNote: "اطلاعات بهصورت خصوصی و پایدار ذخیره شد.",
  bankingInvalidCard: "شماره کارت باید ۱۶ رقم باشد",
  bankingInvalidSheba: "شماره شبا باید به شکل IR و ۲۴ رقم باشد",
  tariffSectionTitle: "تعرفهها و پرداخت",
  tariffSectionNote: "قیمت خدمات خود را ثبت کنید؛ قیمت ثبتنشده بهعنوان رایگان نمایش داده نمیشود.",
  tariffPrivate: "برنامه خصوصی",
  tariffSemiPrivate: "برنامه نیمهخصوصی",
  tariffIrr: "ریال",
  tariffUsd: "دلار",
  tariffUnset: "تعرفه ثبت نشده",
  tariffSave: "ذخیره تعرفهها",
  tariffSaved: "تعرفهها ذخیره شد",
  paymentsSectionTitle: "درخواستهای پرداخت",
  paymentsEmpty: "هنوز درخواست پرداختی ثبت نکردهاید.",
  paymentCreate: "درخواست پرداخت جدید",
  paymentStatusLabel: "وضعیت",
  paymentStatusPending: "در انتظار تأیید دانشجو",
  paymentStatusConfirmed: "تأییدشده — در انتظار پرداخت",
  paymentStatusDeclined: "ردشده",
  paymentStatusCancelled: "لغوشده",
  paymentAwaitingPayment: "در انتظار پرداخت",
  paymentStudentLabel: "دانشجو",
  paymentCoachLabel: "مربی",
  paymentServiceLabel: "نوع خدمات",
  paymentAmountLabel: "مبلغ",
  paymentDescriptionLabel: "توضیح پرداخت",
  paymentLinkLabel: "لینک پرداخت خارجی (https)",
  paymentLinkPlaceholder: "https://example.com/pay/...",
  paymentConfirmTitle: "تأیید درخواست پرداخت",
  paymentConfirmNote: "با تأیید، لینک پرداخت فعال میشود. باز کردن لینک بهمعنی پرداخت موفق نیست.",
  paymentConfirm: "تأیید و فعالسازی لینک",
  paymentDecline: "رد درخواست",
  paymentCancel: "لغو درخواست",
  paymentOpenLink: "باز کردن لینک پرداخت",
  paymentLinkLockedNote: "لینک پس از تأیید شما فعال میشود.",
  paymentLinkNote: "پرداخت در درگاه خارجی انجام میشود؛ وضعیت پرداخت در مرحله بعد متصل میشود.",
  paymentCreated: "درخواست پرداخت ثبت شد",
  paymentCancelled: "درخواست پرداخت لغو شد",
  paymentConfirmedNote: "لینک پرداخت فعال شد؛ برای پرداخت به درگاه خارجی بروید.",
  paymentDeclinedNote: "درخواست رد شد و به مربی اطلاع داده شد.",
  exercisesSectionTitle: "بانک حرکات شخصی",
  exercisesSectionNote: "حرکات اختصاصی خود را با رسانه آموزشی بسازید؛ فقط شما و برنامههای شما به آن دسترسی دارند.",
  exercisesEmpty: "هنوز حرکت شخصی نساختهاید.",
  exerciseCreate: "حرکت جدید",
  exerciseEdit: "ویرایش",
  exerciseDelete: "حذف",
  exerciseDeleteConfirm: "حرکت حذف شود؟ برنامههای ارسالشده قبلی سالم میمانند؛ فقط ساخت برنامه جدید با آن ممکن نخواهد بود.",
  exerciseNameFa: "نام فارسی حرکت",
  exerciseNameEn: "نام انگلیسی حرکت",
  exerciseCategory: "گروه حرکت",
  exerciseEquipment: "تجهیزات",
  exercisePrimaryMuscles: "عضلات اصلی",
  exerciseSecondaryMuscles: "عضلات کمکی",
  exerciseDescription: "توضیحات",
  exerciseTips: "نکات اجرای صحیح",
  exerciseMedia: "رسانههای آموزشی",
  exerciseMediaUpload: "افزودن رسانه",
  personalVideoPlay: "ویدئو",
  personalVideoPlayAria: (name) => `پخش ویدئوی حرکت ${name}`,
  exerciseMediaEmpty: "هنوز رسانهای بارگذاری نشده است.",
  exerciseMediaImageNote: "تصویر: JPEG/PNG/WebP حداکثر ۵ مگابایت",
  exerciseMediaVideoNote: "ویدئو: MP4/WebM حداکثر ۵۰ مگابایت",
  exerciseSaved: "حرکت ذخیره شد",
  exerciseDeleted: "حرکت حذف شد",
  exerciseSourcePersonal: "شخصی",
  exerciseSourcePublic: "عمومی",
  exercisePersonalBadge: "حرکت شخصی",
  librarySearchPlaceholder: "جست‌وجو در حرکات شخصی (نام فارسی یا انگلیسی)…",
  librarySearchAria: "جست‌وجو در بانک حرکات شخصی شما",
  librarySearchClear: "پاک‌کردن جست‌وجو",
  libraryNoResults: "هیچ حرکتی با این جست‌وجو یا فیلتر پیدا نشد.",
  libraryFilterCategory: "دسته",
  libraryFilterMuscle: "عضله",
  libraryFilterAll: "همه",
  libraryCapBadge: (count, cap) => `${count} از ${cap} حرکت`,
  libraryCapBadgeAria: (count, cap) => `${count} حرکت از سقف ${cap} کتابخانه شخصی شما`,
  saveToLibrary: "ذخیره در کتابخانه من",
  saveToLibrarySaved: "حرکت عمومی به کتابخانه شخصی شما اضافه شد؛ اکنون قابل ویرایش است.",
  saveToLibraryAria: (name) => `ذخیره ${name} در کتابخانه شخصی من`,
  saveToLibraryBusyAria: "در حال ذخیره در کتابخانه شخصی",
  studentDetailTitle: "اطلاعات تکمیلی دانشجو",
  studentDetailProfile: "مشخصات پروفایل",
  studentDetailPlans: "برنامههای اختصاصیافته",
  studentDetailProgress: "سابقه پیشرفت تمرینی",
  studentDetailNote: "یادداشت خصوصی مربی",
  studentDetailNotePlaceholder: "یادداشت خصوصی شما درباره این دانشجو — فقط خودتان میبینید",
  studentDetailNoteSave: "ذخیره یادداشت",
  studentDetailNoteSaved: "یادداشت ذخیره شد",
  studentDetailNotePrivacy: "این یادداشت فقط برای شماست و هرگز برای دانشجو نمایش داده نمیشود.",
  studentDetailServiceType: "نوع خدمات",
  studentDetailSessions: (n) => `${localeNumberFa(n)} جلسه تکمیلشده`,
  studentDetailLastSession: "آخرین جلسه",
  studentDetailNoPlans: "هنوز برنامهای به این دانشجو ارسال نشده است.",
  studentDetailChat: "گفتوگو با دانشجو",
  studentFilterAll: "همه",
  studentFilterPrivate: "خصوصی",
  studentFilterSemiPrivate: "نیمهخصوصی",
  studentsSearchPlaceholder: "جستوجوی نام دانشجو",
  studentsEmpty: "هنوز دانشجوی فعالی ندارید.",
  studentInfoButton: "اطلاعات تکمیلی",
  chatBlockAction: "مسدود کردن",
  chatUnblockAction: "رفع مسدودیت",
  chatBlockedBanner: "شما این دانشجو را مسدود کردهاید؛ او نمیتواند پیام جدیدی بفرستد. تاریخچه حفظ شده است.",
  chatBlockedMeBanner: "ارسال پیام جدید ممکن نیست؛ دسترسی شما به این گفتوگو توسط مربی محدود شده است. تاریخچه حفظ شده است.",
  chatBlocksTitle: "کاربران مسدودشده",
  chatBlocksEmpty: "کسی را مسدود نکردهاید.",
  chatPreApprovalLabel: "درخواست در انتظار بررسی",
  chatPreApprovalButton: "گفتوگو با دانشجو",
  chatViewProfile: "مشاهده پروفایل",
  chatStudentProfileTitle: "پروفایل دانشجو",
  chatProfileLoadError: "خواندن پروفایل ممکن نشد",
  chatBackToConversation: "بازگشت به گفتوگو",
  planFormSource: "منبع حرکت",
  planFormSourcePublic: "بانک عمومی",
  planFormSourcePersonal: "حرکات شخصی من",
  planFormPersonalEmpty: "هنوز حرکت شخصی ندارید؛ از بخش «بانک حرکات شخصی» بسازید.",
  planFormSavingState: "در حال ذخیره…",
  planFormAssignNote: "پس از ذخیره پیشنویس، میتوانید برنامه را از کارت آن به دانشجو ارسال کنید.",
  planFormNoWeightFieldNote: "وزنه پیشنهادی حذف شد؛ اجرای وزنه در جلسه با ثبت ستها مدیریت میشود.",
};

const en: Phase196Strings = {
  notificationsTitle: "Notifications",
  notificationsEmpty: "No notifications yet; important account events will appear here.",
  markAllRead: "Mark all read",
  unreadCountLabel: (n) => `${n} unread notification${n === 1 ? "" : "s"}`,
  notifMessageNew: "New message received",
  notifConnectionRequest: "New connection request received",
  notifConnectionApproved: "Your connection request was approved",
  notifConnectionRejected: "Your connection request was rejected",
  notifConnectionCancelled: "The student cancelled the request",
  notifCoachApplicationApproved: "Your coach application was approved",
  notifCoachApplicationRejected: "Your coach application was rejected",
  notifPremiumApproved: "Your upgrade request was approved",
  notifPremiumRejected: "Your upgrade request was rejected",
  notifSupportReply: "New support reply received",
  notifSupportTicketNew: "New support ticket submitted",
  notifPlanDelivered: "A new workout plan was sent to you",
  notifPlanDeliveredNutrition: "A new nutrition plan was sent to you",
  notifPaymentRequest: "A new payment request was created for you",
  notifPaymentConfirmed: "The student confirmed the payment request",
  notifPaymentDeclined: "The student declined the payment request",
  notifPaymentCancelled: "The payment request was cancelled",
  notifUnknownType: "Account event",
  bankingSectionTitle: "Banking information",
  bankingSectionNote: "Enter your payment details to use in payment workflows.",
  bankingPrivacyNote: "This information is fully private and visible only to you; it never appears in any public profile or other panel.",
  accountHolderLabel: "Account holder",
  bankNameLabel: "Bank name",
  accountNumberLabel: "Account number",
  cardNumberLabel: "Card number (16 digits)",
  shebaLabel: "IBAN / SHEBA (IR + 24 digits)",
  bankingNoteLabel: "Note (optional)",
  bankingSave: "Save banking info",
  bankingSaved: "Banking info saved",
  bankingSavedNote: "Your details were saved privately and persistently.",
  bankingInvalidCard: "Card number must be 16 digits",
  bankingInvalidSheba: "IBAN must look like IR followed by 24 digits",
  tariffSectionTitle: "Tariffs & payments",
  tariffSectionNote: "Set your service prices; an unset price is never shown as free.",
  tariffPrivate: "Private program",
  tariffSemiPrivate: "Semi-private program",
  tariffIrr: "IRR",
  tariffUsd: "USD",
  tariffUnset: "Tariff not set",
  tariffSave: "Save tariffs",
  tariffSaved: "Tariffs saved",
  paymentsSectionTitle: "Payment requests",
  paymentsEmpty: "No payment requests yet.",
  paymentCreate: "New payment request",
  paymentStatusLabel: "Status",
  paymentStatusPending: "Awaiting student confirmation",
  paymentStatusConfirmed: "Confirmed — awaiting payment",
  paymentStatusDeclined: "Declined",
  paymentStatusCancelled: "Cancelled",
  paymentAwaitingPayment: "Awaiting payment",
  paymentStudentLabel: "Student",
  paymentCoachLabel: "Coach",
  paymentServiceLabel: "Service type",
  paymentAmountLabel: "Amount",
  paymentDescriptionLabel: "Payment description",
  paymentLinkLabel: "External payment link (https)",
  paymentLinkPlaceholder: "https://example.com/pay/...",
  paymentConfirmTitle: "Confirm payment request",
  paymentConfirmNote: "Confirming activates the payment link. Opening the link is not a successful payment.",
  paymentConfirm: "Confirm & activate link",
  paymentDecline: "Decline",
  paymentCancel: "Cancel request",
  paymentOpenLink: "Open payment link",
  paymentLinkLockedNote: "The link activates after your confirmation.",
  paymentLinkNote: "Payment happens in the external gateway; payment status integration comes in the next phase.",
  paymentCreated: "Payment request created",
  paymentCancelled: "Payment request cancelled",
  paymentConfirmedNote: "The payment link is now active; continue in the external gateway.",
  paymentDeclinedNote: "The request was declined and the coach was notified.",
  exercisesSectionTitle: "My exercise bank",
  exercisesSectionNote: "Build your own exercises with training media; only you and your plans can access them.",
  exercisesEmpty: "No personal exercises yet.",
  exerciseCreate: "New exercise",
  exerciseEdit: "Edit",
  exerciseDelete: "Delete",
  exerciseDeleteConfirm: "Delete this exercise? Previously sent plans stay intact; only creating new plans with it becomes impossible.",
  exerciseNameFa: "Persian name",
  exerciseNameEn: "English name",
  exerciseCategory: "Category",
  exerciseEquipment: "Equipment",
  exercisePrimaryMuscles: "Primary muscles",
  exerciseSecondaryMuscles: "Secondary muscles",
  exerciseDescription: "Description",
  exerciseTips: "Execution tips",
  exerciseMedia: "Training media",
  exerciseMediaUpload: "Add media",
  personalVideoPlay: "Video",
  personalVideoPlayAria: (name) => `Play exercise video of ${name}`,
  exerciseMediaEmpty: "No media uploaded yet.",
  exerciseMediaImageNote: "Image: JPEG/PNG/WebP up to 5 MB",
  exerciseMediaVideoNote: "Video: MP4/WebM up to 50 MB",
  exerciseSaved: "Exercise saved",
  exerciseDeleted: "Exercise deleted",
  exerciseSourcePersonal: "Personal",
  exerciseSourcePublic: "Public",
  exercisePersonalBadge: "Personal exercise",
  librarySearchPlaceholder: "Search personal exercises (Persian or English name)…",
  librarySearchAria: "Search your personal exercise bank",
  librarySearchClear: "Clear search",
  libraryNoResults: "No exercises match this search or filter.",
  libraryFilterCategory: "Category",
  libraryFilterMuscle: "Muscle",
  libraryFilterAll: "All",
  libraryCapBadge: (count, cap) => `${count} of ${cap} exercises`,
  libraryCapBadgeAria: (count, cap) => `${count} exercises out of your ${cap}-exercise library cap`,
  saveToLibrary: "Save to my library",
  saveToLibrarySaved: "Public exercise added to your personal library; it is now editable.",
  saveToLibraryAria: (name) => `Save ${name} to my personal library`,
  saveToLibraryBusyAria: "Saving to personal library",
  studentDetailTitle: "Student details",
  studentDetailProfile: "Profile",
  studentDetailPlans: "Assigned plans",
  studentDetailProgress: "Training progress",
  studentDetailNote: "Private coach note",
  studentDetailNotePlaceholder: "Your private note about this student — only you can see it",
  studentDetailNoteSave: "Save note",
  studentDetailNoteSaved: "Note saved",
  studentDetailNotePrivacy: "This note is only visible to you and is never shown to the student.",
  studentDetailServiceType: "Service type",
  studentDetailSessions: (n) => `${n} completed session${n === 1 ? "" : "s"}`,
  studentDetailLastSession: "Last session",
  studentDetailNoPlans: "No plans have been sent to this student yet.",
  studentDetailChat: "Chat with student",
  studentFilterAll: "All",
  studentFilterPrivate: "Private",
  studentFilterSemiPrivate: "Semi-private",
  studentsSearchPlaceholder: "Search student name",
  studentsEmpty: "No active students yet.",
  studentInfoButton: "Details",
  chatBlockAction: "Block",
  chatUnblockAction: "Unblock",
  chatBlockedBanner: "You blocked this student; they cannot send new messages. History is preserved.",
  chatBlockedMeBanner: "Sending new messages is not possible; the coach restricted your access to this chat. History is preserved.",
  chatBlocksTitle: "Blocked users",
  chatBlocksEmpty: "You have not blocked anyone.",
  chatPreApprovalLabel: "Request pending review",
  chatPreApprovalButton: "Chat with student",
  chatViewProfile: "View profile",
  chatStudentProfileTitle: "Student profile",
  chatProfileLoadError: "Could not load the profile",
  chatBackToConversation: "Back to chat",
  planFormSource: "Exercise source",
  planFormSourcePublic: "Public bank",
  planFormSourcePersonal: "My personal exercises",
  planFormPersonalEmpty: "No personal exercises yet; create some in “My exercise bank”.",
  planFormSavingState: "Saving…",
  planFormAssignNote: "After saving the draft, you can send the plan to a student from its card.",
  planFormNoWeightFieldNote: "Suggested weight field was removed; actual loads are managed via set logging in sessions.",
};

/** فارسی‌سازی اعداد برای برچسب‌های شمارشی */
function localeNumberFa(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function phase196Strings(locale: Locale): Phase196Strings {
  return locale === "en" ? en : fa;
}
