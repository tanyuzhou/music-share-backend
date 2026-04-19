import { Router } from "express";
import healthRouter from "./health.route.js";
import homeRouter from "./home.route.js";
import authRouter from "./auth.route.js";
import musicRouter from "./music.route.js";
import reviewRouter from "./review.route.js";
import favoriteRouter from "./favorite.route.js";
import playlistRouter from "./playlist.route.js";
import userRouter from "./user.route.js";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(homeRouter);
apiRouter.use(authRouter);
apiRouter.use(musicRouter);
apiRouter.use(reviewRouter);
apiRouter.use(favoriteRouter);
apiRouter.use(playlistRouter);
apiRouter.use(userRouter);

export default apiRouter;
