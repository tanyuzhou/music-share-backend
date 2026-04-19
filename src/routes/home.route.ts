import { Router } from "express";
import { getMyHomeFeed, getPublicHomeFeed } from "../controllers/home.controller.js";
import { requireLogin } from "../middlewares/auth.js";

const homeRouter = Router();

homeRouter.get("/home/public", getPublicHomeFeed);
homeRouter.get("/home/me", requireLogin, getMyHomeFeed);

export default homeRouter;
