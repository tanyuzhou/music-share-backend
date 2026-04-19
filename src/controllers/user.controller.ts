import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fail, ok } from "../middlewares/response.js";
import { User } from "../models/user.model.js";

const PROTECTED_SUPER_ADMIN_USERNAME = "music_share_super_admin";

function isProtectedSuperAdmin(user: any) {
  return user?.username === PROTECTED_SUPER_ADMIN_USERNAME;
}

function toSelfUser(user: any) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    bio: user.bio,
    favoriteGenre: user.favoriteGenre,
    favoritesVisibility: user.favoritesVisibility,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function getPublicUser(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) {
      return res.status(404).json(fail(1404, "user not found"));
    }

    return res.status(200).json(
      ok({
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          displayName: user.displayName,
          bio: user.bio,
          favoriteGenre: user.favoriteGenre,
          createdAt: user.createdAt
        }
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to get public user"));
  }
}

export async function getMyProfile(req: any, res: any) {
  try {
    const user = await User.findById(req.authUser._id);
    if (!user || !user.isActive) {
      return res.status(200).json(fail(1002, "login required"));
    }

    return res.status(200).json(ok({ user: toSelfUser(user) }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to get my profile"));
  }
}

export async function updateMyProfile(req: any, res: any) {
  try {
    const user = await User.findById(req.authUser._id);
    if (!user || !user.isActive) {
      return res.status(200).json(fail(1002, "login required"));
    }

    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
      user.displayName = String(body.displayName || "").trim().slice(0, 50);
    }

    if (Object.prototype.hasOwnProperty.call(body, "bio")) {
      user.bio = String(body.bio || "").trim().slice(0, 300);
    }

    if (Object.prototype.hasOwnProperty.call(body, "favoriteGenre")) {
      user.favoriteGenre = String(body.favoriteGenre || "").trim().slice(0, 40);
    }

    if (Object.prototype.hasOwnProperty.call(body, "favoritesVisibility")) {
      const visibility = String(body.favoritesVisibility || "").toUpperCase();
      if (!["PRIVATE", "PUBLIC"].includes(visibility)) {
        return res.status(200).json(fail(1001, "favoritesVisibility must be PRIVATE or PUBLIC"));
      }
      user.favoritesVisibility = visibility as "PRIVATE" | "PUBLIC";
    }

    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const normalizedEmail = String(body.email || "").trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return res.status(200).json(fail(1001, "invalid email"));
      }

      const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean();
      if (exists) {
        return res.status(200).json(fail(10002, "email already exists"));
      }

      user.email = normalizedEmail;
    }

    await user.save();
    return res.status(200).json(ok({ user: toSelfUser(user) }, "updated"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to update my profile"));
  }
}

export async function changeMyPassword(req: any, res: any) {
  try {
    const user = await User.findById(req.authUser._id);
    if (!user || !user.isActive) {
      return res.status(200).json(fail(1002, "login required"));
    }

    if (isProtectedSuperAdmin(user)) {
      return res.status(200).json(fail(1003, "music_share_super_admin password cannot be changed"));
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(200).json(fail(1001, "currentPassword and newPassword are required"));
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(200).json(fail(1001, "newPassword must be at least 6 chars"));
    }

    const matched = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!matched) {
      return res.status(200).json(fail(1002, "current password is incorrect"));
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    return res.status(200).json(ok({}, "password updated"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to change password"));
  }
}

export async function adminListUsers(req: any, res: any) {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json(
      ok({
        list: users.map((u: any) => ({
          id: u._id,
          username: u.username,
          email: u.email,
          role: u.role,
          displayName: u.displayName,
          isActive: u.isActive,
          createdAt: u.createdAt
        }))
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list users"));
  }
}

export async function adminUpdateUserRole(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    if (String(req.authUser?._id) === String(userId)) {
      return res.status(200).json(fail(1003, "you cannot change your own role"));
    }

    const role = String(req.body?.role || "").toUpperCase();
    if (!["LISTENER", "MODERATOR", "SUPER_ADMIN"].includes(role)) {
      return res.status(200).json(fail(1001, "invalid role"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(fail(1404, "user not found"));
    }

    if (isProtectedSuperAdmin(user)) {
      return res
        .status(200)
        .json(fail(1003, "default super admin account (music_share_super_admin) is not allowed to be modified"));
    }

    user.role = role;
    await user.save();
    return res.status(200).json(ok({}, "role updated"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to update role"));
  }
}

export async function adminUpdateUserActive(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    const isActive = Boolean(req.body?.isActive);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(fail(1404, "user not found"));
    }

    if (isProtectedSuperAdmin(user)) {
      return res
        .status(200)
        .json(fail(1003, "default super admin account (music_share_super_admin) is not allowed to be modified"));
    }

    user.isActive = isActive;
    await user.save();
    return res.status(200).json(ok({}, "status updated"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to update status"));
  }
}
