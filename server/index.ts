import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getUploadDir } from "./storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 3000);

async function createServer() {
  const app = express();

  // Health check
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

  // tRPC API
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Uploaded documents/photos
  app.use("/uploads", express.static(getUploadDir()));

  if (isProduction) {
    // Serve the built client and fall back to index.html for SPA routes.
    const distDir = path.join(ROOT, "dist");
    if (!fs.existsSync(distDir)) {
      throw new Error(
        "dist/ not found. Run `npm run build` before starting in production.",
      );
    }
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    // Development: use Vite as middleware for HMR + on-the-fly transforms.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: ROOT,
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(PORT, () => {
    console.log(
      `\n  Empire Claims Group running at http://localhost:${PORT}` +
        `  (${isProduction ? "production" : "development"})\n`,
    );
  });
}

createServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
