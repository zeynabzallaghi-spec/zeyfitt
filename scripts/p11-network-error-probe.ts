/**
 * پروب تشخیصی مرحله ۱۱ — چه خطایی از fetch به نشانی غیرقابل‌دسترس بیرون می‌آید
 * و آیا الگوی classify (econnrefused/fetch failed/network/socket) آن را می‌گیرد؟
 * اجرا: bun scripts/p11-network-error-probe.ts
 */
const cases: Array<[string, string]> = [
  ["port-9-refused", "http://127.0.0.1:9/v1/chat/completions"],
  ["port-1-refused", "http://127.0.0.1:1/v1/chat/completions"],
  ["nonresolving-host", "http://no-such-host-p11.invalid/v1/chat/completions"],
];

for (const [label, url] of cases) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer dummy" },
      body: JSON.stringify({ model: "x", messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(4000),
    });
    console.log(`${label}: HTTP ${res.status} (no throw)`);
  } catch (e) {
    const err = e as Error;
    const raw = `${err.name} ${err.message}`.toLowerCase();
    const matched =
      /timeout|timed out|abort|etimedout/.test(raw)
        ? "AI_TIMEOUT"
        : /enotfound|econnrefused|econnreset|fetch failed|unable to connect|network|socket/.test(raw)
          ? "AI_NETWORK"
          : "AI_PROVIDER(unmatched)";
    console.log(
      `${label}: name=${err.name} | msg=${err.message.slice(0, 120)} | classify→ ${matched}`
    );
  }
}
