import { User } from "../models/user.model.js";
import { fail } from "./response.js";

export async function requireLogin(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(200).json(fail(1002, "login required"));
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(200).json(fail(1002, "login required"));
    }

    if (!user.isActive) {
      return res.status(200).json(fail(10003, "account is disabled"));
    }

    req.authUser = user;
    return next();
  } catch (error) {
    return res.status(200).json(fail(1004, "internal server error"));
  }
}
