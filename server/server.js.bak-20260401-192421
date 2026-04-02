import express from "express";
import cors from "cors";
import routes from "./routes.js";

const app = express();

// ✅ CORS FIX
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// ✅ Mount API routes
app.use("/api", routes);

// ✅ Start server
const PORT = 8787;

app.listen(PORT, () => {
  console.log(`Wingman backend running on http://127.0.0.1:${PORT}`);
});
