import { Router } from "express";
import { requireLogin } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/role.js";
import {
	adminListUsers,
	adminUpdateUserActive,
	adminUpdateUserRole,
	changeMyPassword,
	getMyProfile,
	getPublicUser,
	updateMyProfile
} from "../controllers/user.controller.js";
import { followUser, listFollowers, listFollowing, unfollowUser } from "../controllers/follow.controller.js";

const userRouter = Router();

userRouter.get("/users/me", requireLogin, getMyProfile);
userRouter.put("/users/me", requireLogin, updateMyProfile);
userRouter.patch("/users/me/password", requireLogin, changeMyPassword);
userRouter.get("/admin/users", requireLogin, requireRole(["SUPER_ADMIN"]), adminListUsers);
userRouter.patch("/admin/users/:userId/role", requireLogin, requireRole(["SUPER_ADMIN"]), adminUpdateUserRole);
userRouter.patch("/admin/users/:userId/active", requireLogin, requireRole(["SUPER_ADMIN"]), adminUpdateUserActive);
userRouter.get("/users/:userId/public", getPublicUser);
userRouter.post("/users/:userId/follow", requireLogin, followUser);
userRouter.delete("/users/:userId/follow", requireLogin, unfollowUser);
userRouter.get("/users/:userId/followers", listFollowers);
userRouter.get("/users/:userId/following", listFollowing);

export default userRouter;
