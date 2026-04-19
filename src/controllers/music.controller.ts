import { fail, ok } from "../middlewares/response.js";
import { lookupTrack, searchSongs } from "../utils/itunes.js";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export async function search(req, res) {
  try {
    const criteria = String(req.query.criteria || "").trim();
    if (!criteria) {
      return res.status(200).json(fail(1001, "criteria is required"));
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limitRaw = parsePositiveInt(req.query.limit, 20);
    const limit = Math.min(limitRaw, 50);

    const result = await searchSongs({ criteria, page, limit });

    return res.status(200).json(
      ok({
        list: result.list,
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "search failed"));
  }
}

export async function getTrack(req, res) {
  try {
    const { trackId } = req.params;
    const parsedId = Number.parseInt(trackId, 10);
    if (Number.isNaN(parsedId)) {
      return res.status(200).json(fail(1001, "invalid trackId"));
    }

    const track = await lookupTrack(parsedId);
    if (!track) {
      return res.status(404).json(fail(1404, "track not found"));
    }

    return res.status(200).json(ok(track));
  } catch (error) {
    return res.status(200).json(fail(1004, "lookup failed"));
  }
}
