/**
 * p196-media-test.ts — تست انتها-به-انتها رسانه حرکت شخصی (مرحله ۲۰، بخش ۱۱).
 * مربی fixture میسازد + حرکت شخصی + آپلود PNG + خواندن بایت‌به‌بایت + حذف.
 * همه آثار در پایان پاک میشود.
 */

const BASE = "http://localhost:3000";
const EMAIL = `p196-media-${Date.now()}@fixture.local`;
const PASSWORD = "Md8#kQ3wLp!5zX7k";

interface Check { name: string; ok: boolean; detail: string }
const checks: Check[] = [];
function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}: ${detail}`);
}

async function main() {
  // ۱) ثبت‌نام + ارتقای نقش به مربی + پروفایل
  const signUp = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "مربی رسانه" }),
  });
  const cookie = (signUp.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  record("sign-up", signUp.ok && !!cookie, `status=${signUp.status}`);

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const user = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!user) throw new Error("fixture user missing");
  await db.user.update({ where: { id: user.id }, data: { role: "COACH" } });

  try {
    // ۲) ساخت حرکت شخصی
    const createRes = await fetch(`${BASE}/api/coach/exercises`, {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        faName: "حرکت تست رسانه",
        enName: "Media Test Move",
        category: "chest",
        primaryMuscles: ["chest"],
        secondaryMuscles: [],
        equipment: ["dumbbell"],
        description: "تست",
        tips: "",
      }),
    });
    const createBody = (await createRes.json()) as { exercise?: { id: string } };
    record("create exercise", createRes.ok, `status=${createRes.status} id=${createBody.exercise?.id ?? "?"}`);
    if (!createRes.ok || !createBody.exercise) throw new Error("exercise create failed: " + JSON.stringify(createBody).slice(0, 300));
    const exerciseId = createBody.exercise.id;

    // ۳) آپلود PNG واقعی (امضای بایت معتبر)
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0300050001a5f645400000000049454e44ae426082",
      "hex"
    );
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "test.png");
    const upRes = await fetch(`${BASE}/api/coach/exercises/${encodeURIComponent(exerciseId)}/media`, {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    const upBody = (await upRes.json().catch(() => ({}))) as { media?: { id: string }; error?: string };
    record(
      "upload media",
      upRes.ok && !!upBody.media?.id,
      `status=${upRes.status} id=${upBody.media?.id ?? "-"} error=${upBody.error ?? "-"}`
    );

    if (upBody.media?.id) {
      // ۴) خواندن رسانه با کلیک (GET بایت‌به‌بایت)
      const getRes = await fetch(`${BASE}/api/coach/exercises/media/${encodeURIComponent(upBody.media.id)}`, {
        headers: { cookie },
      });
      const bytes = new Uint8Array(await getRes.arrayBuffer());
      const signatureOk = bytes[0] === 0x89 && bytes[1] === 0x50;
      record(
        "view media (GET bytes)",
        getRes.ok && signatureOk && bytes.length === png.length,
        `status=${getRes.status} bytes=${bytes.length}/${png.length} sig=${signatureOk}`
      );

      // ۵) حذف رسانه
      const delRes = await fetch(`${BASE}/api/coach/exercises/media/${encodeURIComponent(upBody.media.id)}`, {
        method: "DELETE",
        headers: { cookie },
      });
      record("delete media", delRes.ok, `status=${delRes.status}`);
    }
  } finally {
    // ۶) پاکسازی کامل fixture
    await db.coachExercise.deleteMany({ where: { coachId: user.id } });
    await db.coachProfile.deleteMany({ where: { userId: user.id } });
    await db.fitnessProfile.deleteMany({ where: { userId: user.id } });
    await db.assistantConversation.deleteMany({ where: { userId: user.id } });
    await db.notification.deleteMany({ where: { userId: user.id } });
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.account.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await db.$disconnect();
    console.log("cleanup done");
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
