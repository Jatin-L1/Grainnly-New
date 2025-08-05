import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./database/connectDB.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Server initialization failed:", err);
    process.exit(1);
  });
