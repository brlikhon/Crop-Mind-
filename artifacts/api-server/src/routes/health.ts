import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  let dbStatus: "connected" | "disconnected" = "disconnected";

  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB probe timeout")), 3000)
      ),
    ]);
    await client.query("SELECT 1");
    client.release();
    dbStatus = "connected";
  } catch {
    // DB is unreachable — that's fine, we report it
  }

  res.json({
    status: "ok",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
