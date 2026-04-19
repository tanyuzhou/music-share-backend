import mongoose from "mongoose";
import { fail, ok } from "../middlewares/response.js";
import { Review } from "../models/review.model.js";
import { lookupTrack } from "../utils/itunes.js";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function parseSort(sort) {
  const normalized = String(sort || "createdAt:desc").toLowerCase();
  if (normalized === "createdat:asc") {
    return { createdAt: 1 } as any;
  }

  return { createdAt: -1 } as any;
}

function isValidRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

function toReviewDto(review) {
  const author = review.authorId || {};
  return {
    id: review._id,
    appleTrackId: review.appleTrackId,
    trackName: (review as any).trackName || "",
    artistName: (review as any).artistName || "",
    artworkUrl100: (review as any).artworkUrl100 || "",
    rating: review.rating,
    text: review.text,
    status: review.status,
    moderationReason: review.moderationReason,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    author: {
      id: author._id,
      username: author.username,
      displayName: author.displayName || ""
    }
  };
}

async function attachReviewTrackMeta(reviews: any[]) {
  const trackMap = new Map<number, any>();

  await Promise.all(
    reviews.map(async (review) => {
      const trackId = Number(review.appleTrackId);
      if (!trackId || trackMap.has(trackId)) {
        return;
      }

      try {
        const track = await lookupTrack(trackId);
        trackMap.set(trackId, track || null);
      } catch (_error) {
        trackMap.set(trackId, null);
      }
    })
  );

  return reviews.map((review) => {
    const track = trackMap.get(Number(review.appleTrackId));
    return {
      ...review,
      trackName: track?.trackName || "",
      artistName: track?.artistName || "",
      artworkUrl100: track?.artworkUrl100 || ""
    };
  });
}

export async function listTrackReviews(req, res) {
  try {
    const trackId = Number.parseInt(req.params.trackId, 10);
    if (Number.isNaN(trackId)) {
      return res.status(200).json(fail(1001, "invalid trackId"));
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);
    const sort = parseSort(req.query.sort);

    const filter = {
      appleTrackId: trackId,
      status: "PUBLISHED"
    };

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort(sort as any)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("authorId", "username displayName")
        .lean(),
      Review.countDocuments(filter)
    ]);

    const hydratedItems = await attachReviewTrackMeta(items);

    return res.status(200).json(
      ok({
        list: hydratedItems.map(toReviewDto),
        page,
        limit,
        total
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list reviews"));
  }
}

export async function listMyReviews(req, res) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);

    const filter = {
      authorId: req.authUser._id,
      status: "PUBLISHED"
    };

    const [items, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Review.countDocuments(filter)
    ]);

    const hydratedItems = await attachReviewTrackMeta(items);

    return res.status(200).json(
      ok({
        list: hydratedItems.map(toReviewDto),
        page,
        limit,
        total
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list my reviews"));
  }
}

export async function createTrackReview(req, res) {
  try {
    const trackId = Number.parseInt(req.params.trackId, 10);
    if (Number.isNaN(trackId)) {
      return res.status(200).json(fail(1001, "invalid trackId"));
    }

    const { rating, text } = req.body || {};
    const trimmedText = String(text || "").trim();

    if (!isValidRating(rating)) {
      return res.status(200).json(fail(10004, "rating must be integer between 1 and 5"));
    }

    if (trimmedText.length < 5 || trimmedText.length > 1000) {
      return res.status(200).json(fail(10005, "review text length must be between 5 and 1000"));
    }

    const created = await Review.create({
      appleTrackId: trackId,
      authorId: req.authUser._id,
      rating,
      text: trimmedText,
      status: "PUBLISHED"
    });

    const hydrated = await Review.findById(created._id).populate("authorId", "username displayName").lean();

    return res.status(200).json(ok({ review: toReviewDto(hydrated) }, "created"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to create review"));
  }
}

export async function updateReview(req, res) {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(200).json(fail(1001, "invalid reviewId"));
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json(fail(1404, "review not found"));
    }

    const isOwner = String(review.authorId) === String(req.authUser._id);
    if (!isOwner) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    const updates: any = {};

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "rating")) {
      if (!isValidRating(req.body.rating)) {
        return res.status(200).json(fail(10004, "rating must be integer between 1 and 5"));
      }
      updates.rating = req.body.rating;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "text")) {
      const trimmedText = String(req.body.text || "").trim();
      if (trimmedText.length < 5 || trimmedText.length > 1000) {
        return res.status(200).json(fail(10005, "review text length must be between 5 and 1000"));
      }
      updates.text = trimmedText;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json(fail(1001, "no updatable fields provided"));
    }

    updates.status = "PUBLISHED";
    updates.moderationReason = "";

    const updated = await Review.findByIdAndUpdate(reviewId, updates, { new: true })
      .populate("authorId", "username displayName")
      .lean();

    return res.status(200).json(ok({ review: toReviewDto(updated) }, "updated"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to update review"));
  }
}

export async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(200).json(fail(1001, "invalid reviewId"));
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json(fail(1404, "review not found"));
    }

    const isOwner = String(review.authorId) === String(req.authUser._id);
    const isSuperAdmin = req.authUser.role === "SUPER_ADMIN";

    if (!isOwner && !isSuperAdmin) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    await Review.findByIdAndDelete(reviewId);
    return res.status(200).json(ok({}, "deleted"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to delete review"));
  }
}
