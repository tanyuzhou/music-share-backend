import dotenv from "dotenv";

const envName = process.env.NODE_ENV === "production" ? "production" : "development";
dotenv.config({ path: `.env.${envName}` });

export const env = {
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/music_share",
  sessionSecret: process.env.SESSION_SECRET || "dev_secret_change_me",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
};
