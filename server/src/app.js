import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({
  extended: true,
  limit: "50kb",
}));
app.use(cookieParser());

// Import routes
import deliveryRiderRoutes from "./routes/deliveryRider.routes.js";
import adminRoutes from "./routes/admin.routes.js";

app.use("/api/delivery", deliveryRiderRoutes);
app.use("/api/admin", adminRoutes);

export default app;