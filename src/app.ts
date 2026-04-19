import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import apiRouter from "./routes/index.js";
import { env } from "./config/env.js";
import { fail } from "./middlewares/response.js";

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);

app.use(express.json());

app.use(
  session({
    name: "sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    },
    store: MongoStore.create({
      mongoUrl: env.mongodbUri,
      ttl: 60 * 60 * 24 * 7
    })
  })
);

app.use("/api", apiRouter);

app.use((req, res) => {
  res.status(404).json(fail(1404, "not found"));
});

export default app;
