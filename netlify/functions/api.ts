import serverless from "serverless-http";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "../../server/routes/demo";
import { handleKlaviyoContact } from "../../server/routes/klaviyo";

function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Klaviyo route
  app.post("/api/klaviyo/contact", handleKlaviyoContact);

  return app;
}

export const handler = serverless(createServer());
