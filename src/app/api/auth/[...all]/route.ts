import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// نقاط پایانی استاندارد better-auth: /api/auth/sign-up/email و ...
export const { GET, POST } = toNextJsHandler(auth);
