import express from "express";
import dotenv from "dotenv";
import routes from "./routes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use("/api", routes);

app.listen(3000, () => console.log("Wingman running on http://localhost:3000"));