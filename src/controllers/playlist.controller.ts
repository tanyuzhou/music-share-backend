import mongoose from "mongoose";
import { fail, ok } from "../middlewares/response.js";
import { Playlist } from "../models/playlist.model.js";
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

function toPlaylistDto(playlist) {
  const owner = playlist.ownerId || {};
  const trackItems = Array.isArray(playlist.trackItems)
    ? playlist.trackItems.map((item) => ({
        ...item,
        artworkUrl100: normalizeArtworkUrl(item.artworkUrl100)
      }))
    : [];

  return {
    id: playlist._id,
    title: playlist.title,
    description: playlist.description,
    isPublic: playlist.isPublic,
    owner: {
      id: owner._id || owner,
      username: owner.username,
      displayName: owner.displayName
    },
    trackItems,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt
  };
}

function canModifyPlaylist(authUser, playlist) {
  const isOwner = String(playlist.ownerId) === String(authUser._id);
  const isSuperAdmin = authUser.role === "SUPER_ADMIN";
  return isOwner || isSuperAdmin;
}

export async function listPublicPlaylists(req, res) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);
    const sort = parseSort(req.query.sort);

    const filter = { isPublic: true };

    const [items, total] = await Promise.all([
      Playlist.find(filter)
        .sort(sort as any)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("ownerId", "username displayName")
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return res.status(200).json(ok({ list: items.map(toPlaylistDto), page, limit, total }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list public playlists"));
  }
}

export async function getPlaylistById(req, res) {
  try {
    const { playlistId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(200).json(fail(1001, "invalid playlistId"));
    }

    const playlist = await Playlist.findById(playlistId)
      .populate("ownerId", "username displayName")
      .lean();

    if (!playlist) {
      return res.status(404).json(fail(1404, "playlist not found"));
    }

    if (!playlist.isPublic) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    return res.status(200).json(ok({ playlist: toPlaylistDto(playlist) }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to get playlist"));
  }
}

export async function listUserPublicPlaylists(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json(fail(1001, "invalid userId"));
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);

    const filter = { ownerId: userId, isPublic: true };

    const [items, total] = await Promise.all([
      Playlist.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("ownerId", "username displayName")
        .lean(),
      Playlist.countDocuments(filter)
    ]);

    return res.status(200).json(ok({ list: items.map(toPlaylistDto), page, limit, total }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list user playlists"));
  }
}

export async function listMyPlaylists(req, res) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 50);

    const filter = { ownerId: req.authUser._id };

    const [items, total] = await Promise.all([
      Playlist.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Playlist.countDocuments(filter)
    ]);

    return res.status(200).json(ok({ list: items.map(toPlaylistDto), page, limit, total }));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to list my playlists"));
  }
}

export async function createPlaylist(req, res) {
  try {
    const { title, description = "", isPublic = false } = req.body || {};

    const normalizedTitle = String(title || "").trim();
    if (!normalizedTitle) {
      return res.status(200).json(fail(1001, "title is required"));
    }

    const created = await Playlist.create({
      ownerId: req.authUser._id,
      title: normalizedTitle,
      description: String(description || "").trim(),
      isPublic: Boolean(isPublic),
      trackItems: []
    });

    return res.status(200).json(ok({ playlist: toPlaylistDto(created) }, "created"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to create playlist"));
  }
}

export async function updatePlaylist(req, res) {
  try {
    const { playlistId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(200).json(fail(1001, "invalid playlistId"));
    }

    const found = await Playlist.findById(playlistId);
    if (!found) {
      return res.status(404).json(fail(1404, "playlist not found"));
    }

    if (!canModifyPlaylist(req.authUser, found)) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    const updates: any = {};

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "title")) {
      const normalizedTitle = String(req.body.title || "").trim();
      if (!normalizedTitle) {
        return res.status(200).json(fail(1001, "title cannot be empty"));
      }
      updates.title = normalizedTitle;
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "description")) {
      updates.description = String(req.body.description || "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, "isPublic")) {
      updates.isPublic = Boolean(req.body.isPublic);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json(fail(1001, "no updatable fields provided"));
    }

    const updated = await Playlist.findByIdAndUpdate(playlistId, updates, { new: true })
      .populate("ownerId", "username displayName")
      .lean();

    return res.status(200).json(ok({ playlist: toPlaylistDto(updated) }, "updated"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to update playlist"));
  }
}

export async function deletePlaylist(req, res) {
  try {
    const { playlistId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(200).json(fail(1001, "invalid playlistId"));
    }

    const found = await Playlist.findById(playlistId);
    if (!found) {
      return res.status(404).json(fail(1404, "playlist not found"));
    }

    if (!canModifyPlaylist(req.authUser, found)) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    await Playlist.findByIdAndDelete(playlistId);
    return res.status(200).json(ok({}, "deleted"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to delete playlist"));
  }
}

export async function addTrackToPlaylist(req, res) {
  try {
    const { playlistId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(200).json(fail(1001, "invalid playlistId"));
    }

    const { trackId, trackName, artistName = "", artworkUrl100 = "", trackViewUrl = "" } = req.body || {};
    const parsedTrackId = Number.parseInt(trackId, 10);

    if (Number.isNaN(parsedTrackId) || !String(trackName || "").trim()) {
      return res.status(200).json(fail(1001, "trackId and trackName are required"));
    }

    const found = await Playlist.findById(playlistId);
    if (!found) {
      return res.status(404).json(fail(1404, "playlist not found"));
    }

    if (!canModifyPlaylist(req.authUser, found)) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    const alreadyExists = found.trackItems.some((item) => item.trackId === parsedTrackId);
    if (alreadyExists) {
      return res.status(200).json(fail(1001, "track already exists in playlist"));
    }

    found.trackItems.push({
      trackId: parsedTrackId,
      trackName: String(trackName).trim(),
      artistName: String(artistName || "").trim(),
      artworkUrl100: normalizeArtworkUrl(artworkUrl100),
      trackViewUrl
    });

    await found.save();

    const updated = await Playlist.findById(playlistId).populate("ownerId", "username displayName").lean();
    return res.status(200).json(ok({ playlist: toPlaylistDto(updated) }, "track added"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to add track"));
  }
}

export async function removeTrackFromPlaylist(req, res) {
  try {
    const { playlistId, trackId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(200).json(fail(1001, "invalid playlistId"));
    }

    const parsedTrackId = Number.parseInt(trackId, 10);
    if (Number.isNaN(parsedTrackId)) {
      return res.status(200).json(fail(1001, "invalid trackId"));
    }

    const found = await Playlist.findById(playlistId);
    if (!found) {
      return res.status(404).json(fail(1404, "playlist not found"));
    }

    if (!canModifyPlaylist(req.authUser, found)) {
      return res.status(200).json(fail(1003, "permission denied"));
    }

    const before = found.trackItems.length;
    found.trackItems = found.trackItems.filter((item) => item.trackId !== parsedTrackId) as any;

    if (before === found.trackItems.length) {
      return res.status(404).json(fail(1404, "track not found in playlist"));
    }

    await found.save();

    const updated = await Playlist.findById(playlistId).populate("ownerId", "username displayName").lean();
    return res.status(200).json(ok({ playlist: toPlaylistDto(updated) }, "track removed"));
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to remove track"));
  }
}
