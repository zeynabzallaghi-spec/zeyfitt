-- ایندکس یکتای جزئی SQLite — هر کاربر حداکثر یک جلسه «در حال انجام»
-- Prisma ایندکس‌های جزئی (WHERE) را پشتیبانی نمی‌کند؛ این اسکریپت idempotent است
-- و پس از هر prisma db push (که ایندکس‌های دستی را حذف نمی‌کند) فقط یک‌بار لازم است.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_user
  ON WorkoutSession(userId) WHERE status = 'in_progress';
