import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * خواندن نشست معتبر در کد سمت سرور (Server Components و Route Handlers).
 * اگر نشست نامعتبر/منقضی/ابطال‌شده باشد null برمی‌گردد.
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
