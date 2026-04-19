import { Router } from "express";
import { requireLogin } from "../middlewares/auth.js";
import {
  createTrackReview,
  deleteReview,
  listMyReviews,
  listTrackReviews,
  updateReview
} from "../controllers/review.controller.js";

const reviewRouter = Router();

reviewRouter.get("/users/me/reviews", requireLogin, listMyReviews);
reviewRouter.get("/tracks/:trackId/reviews", listTrackReviews);
reviewRouter.post("/tracks/:trackId/reviews", requireLogin, createTrackReview);
reviewRouter.put("/reviews/:reviewId", requireLogin, updateReview);
reviewRouter.delete("/reviews/:reviewId", requireLogin, deleteReview);

export default reviewRouter;
