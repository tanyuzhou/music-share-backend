import mongoose from "mongoose";
import { fail, ok } from "../middlewares/response.js";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function toFollowUserDto(user: any) {
  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt
  };
}

export async function followUser(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    const followerId = String(req.authUser._id);
    if (followerId === String(userId)) {
      return res.status(200).json(fail(1001, "cannot follow yourself"));
    }

    const followee = await User.findById(userId).lean();
    if (!followee || !followee.isActive) {
      return res.status(404).json(fail(1404, "user not found"));
    }

    const existing = await Follow.findOne({ followerId: req.authUser._id, followeeId: userId });
    if (existing) {
      return res.status(200).json(fail(10006, "already followed"));
    }

    const created = await Follow.create({ followerId: req.authUser._id, followeeId: userId });
    return res.status(200).json(ok({ follow: { id: created._id } }, "followed"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to follow user"));
  }
}

export async function unfollowUser(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    await Follow.findOneAndDelete({ followerId: req.authUser._id, followeeId: userId });
    return res.status(200).json(ok({}, "unfollowed"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to unfollow user"));
  }
}

export async function listFollowers(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);

    const [items, total] = await Promise.all([
      Follow.find({ followeeId: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("followerId", "username displayName role createdAt isActive")
        .lean(),
      Follow.countDocuments({ followeeId: userId })
    ]);

    const list = items
      .map((item: any) => item.followerId)
      .filter((user: any) => user && user.isActive)
      .map((user: any) => toFollowUserDto(user));

    return res.status(200).json(ok({ list, page, limit, total }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list followers"));
  }
}

export async function listFollowing(req: any, res: any) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);

    const [items, total] = await Promise.all([
      Follow.find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("followeeId", "username displayName role createdAt isActive")
        .lean(),
      Follow.countDocuments({ followerId: userId })
    ]);

    const list = items
      .map((item: any) => item.followeeId)
      .filter((user: any) => user && user.isActive)
      .map((user: any) => toFollowUserDto(user));

    return res.status(200).json(ok({ list, page, limit, total }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list following"));
  }
}
