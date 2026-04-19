import { Router } from "express";
import { ok } from "../middlewares/response.js";

const healthRouter = Router();

healthRouter.get("/health", (req, res) => {
  res.status(200).json(
    ok({
      service: "music-share-backend",
      status: "up",
      now: new Date().toISOString()
    })
  );
});

export default healthRouter;
