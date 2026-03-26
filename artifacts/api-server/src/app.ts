import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const publicDir = path.resolve(process.cwd(), "public");
app.use(express.static(publicDir));
// SPA Catch-all (Express 5 safe, avoids path-to-regexp '*' errors)
app.use((_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
