import { Router } from "express";
import { getTrack, search } from "../controllers/music.controller.js";

const musicRouter = Router();

musicRouter.get("/search", search);
musicRouter.get("/tracks/:trackId", getTrack);

export default musicRouter;
