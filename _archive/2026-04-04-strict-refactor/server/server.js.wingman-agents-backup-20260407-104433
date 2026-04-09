import guruRouter from "";
import express from "express";
import cors from "cors";
import routes from "./routes.js";
import guruRouter from "./routes/guru.mjs";

const app = express();

// Ã¢Å“â€¦ CORS FIX
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Ã¢Å“â€¦ Mount API routes
app.use("/api", routes);

// Ã¢Å“â€¦ Start server
const PORT = 8787;
app.use("/api/wingman/guru", guruRouter);

app.listen(PORT, () => {
  console.log(`Wingman backend running on http://127.0.0.1:${PORT}`);
});
