import { Router } from "express";
import { requireLogin } from "../middlewares/auth.js";
import { addMyFavorite, deleteMyFavorite, listMyFavorites } from "../controllers/favorite.controller.js";

const favoriteRouter = Router();

favoriteRouter.get("/users/me/favorites", requireLogin, listMyFavorites);
favoriteRouter.post("/users/me/favorites", requireLogin, addMyFavorite);
favoriteRouter.delete("/users/me/favorites/:trackId", requireLogin, deleteMyFavorite);

export default favoriteRouter;
