import guruRouter from "";
import express from "express";
import cors from "cors";
import routes from "./routes.js";
import guruRouter from "./routes/guru.mjs";import { createAgentsRouter } from "../../../server/routes/agents.mjs";

const app = express();

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CORS FIX
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Mount API routes
app.use("/api", routes);

// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Start server
const PORT = 8787;
app.use("/api/wingman/guru", guruRouter);
app.use("/api/wingman/agents", createAgentsRouter());

app.listen(PORT, () => {
  console.log(`Wingman backend running on http://127.0.0.1:${PORT}`);
});
