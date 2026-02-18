import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { reviewRouter } from "./routes/review.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// PR Review routes
app.use("/api", reviewRouter);

app.listen(PORT, () => {
  console.log(`🚀 PR Review API running on http://localhost:${PORT}`);
});
