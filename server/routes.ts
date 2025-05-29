
import express, { type Express } from "express";
import { createServer } from "http";

export function registerRoutes(app: Express) {
  // Create HTTP server
  const server = createServer(app);

  // Add a basic API route for testing
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // Add other API routes here as needed
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  return server;
}
