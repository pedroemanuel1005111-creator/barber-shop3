export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureTables } = await import("@/db/setup");
    await ensureTables();
  }
}
