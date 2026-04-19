import { Favorite } from "../models/favorite.model.js";
import { fail, ok } from "../middlewares/response.js";
import { normalizeArtworkUrl } from "../utils/artwork.js";

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

function toFavoriteDto(item) {
  return {
    id: item._id,
    appleTrackId: item.appleTrackId,
    trackName: item.trackName,
    artistName: item.artistName,
    artworkUrl100: normalizeArtworkUrl(item.artworkUrl100),
    trackViewUrl: item.trackViewUrl,
    createdAt: item.createdAt
  };
}

export async function listMyFavorites(req, res) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);
    const sort = parseSort(req.query.sort);

    const filter = { userId: req.authUser._id };

    const [items, total] = await Promise.all([
      Favorite.find(filter).sort(sort as any).skip((page - 1) * limit).limit(limit).lean(),
      Favorite.countDocuments(filter)
    ]);

    return res.status(200).json(ok({ list: items.map(toFavoriteDto), page, limit, total }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list favorites"));
  }
}

export async function addMyFavorite(req, res) {
  try {
    const { appleTrackId, trackName, artistName, artworkUrl100 = "", trackViewUrl = "" } = req.body || {};

    const parsedTrackId = Number.parseInt(appleTrackId, 10);
    if (Number.isNaN(parsedTrackId) || !trackName || !artistName) {
      return res.status(200).json(fail(1001, "appleTrackId, trackName, artistName are required"));
    }

    const created = await Favorite.create({
      userId: req.authUser._id,
      appleTrackId: parsedTrackId,
      trackName: String(trackName).trim(),
      artistName: String(artistName).trim(),
      artworkUrl100: normalizeArtworkUrl(artworkUrl100),
      trackViewUrl
    });

    return res.status(200).json(ok({ favorite: toFavoriteDto(created) }, "created"));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json(fail(10006, "favorite already exists"));
    }

    return res.status(200).json(fail(1004, "failed to add favorite"));
  }
}

export async function deleteMyFavorite(req, res) {
  try {
    const parsedTrackId = Number.parseInt(req.params.trackId, 10);
    if (Number.isNaN(parsedTrackId)) {
      return res.status(200).json(fail(1001, "invalid trackId"));
    }

    const deleted = await Favorite.findOneAndDelete({
      userId: req.authUser._id,
      appleTrackId: parsedTrackId
    });

    if (!deleted) {
      return res.status(404).json(fail(1404, "favorite not found"));
    }

    return res.status(200).json(ok({}, "deleted"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to delete favorite"));
  }
}
