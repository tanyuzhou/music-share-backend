import { normalizeArtworkUrl } from "./artwork.js";

const ITUNES_BASE = "https://itunes.apple.com";

export function mapItunesTrack(track) {
  return {
    trackId: track.trackId,
    trackName: track.trackName,
    artistName: track.artistName,
    collectionName: track.collectionName,
    releaseDate: track.releaseDate,
    primaryGenreName: track.primaryGenreName,
    trackTimeMillis: track.trackTimeMillis,
    artworkUrl100: normalizeArtworkUrl(track.artworkUrl100),
    previewUrl: track.previewUrl,
    trackViewUrl: track.trackViewUrl
  };
}

export async function searchSongs({ criteria, page, limit }) {
  const offset = (page - 1) * limit;
  const fetchLimit = Math.min(limit + 1, 200);
  const searchUrl = `${ITUNES_BASE}/search?term=${encodeURIComponent(criteria)}&entity=song&country=US&limit=${fetchLimit}&offset=${offset}`;

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`iTunes search failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  const rawList = payload.results || [];
  const hasMore = rawList.length > limit;
  const list = rawList.slice(0, limit).map(mapItunesTrack);

  // iTunes Search API does not expose a global total count; provide an estimate
  // so clients can still render page state while relying on hasMore for "Next".
  const totalEstimate = hasMore
    ? page * limit + 1
    : offset + list.length;

  return {
    total: totalEstimate,
    hasMore,
    list
  };
}

export async function lookupTrack(trackId) {
  const lookupUrl = `${ITUNES_BASE}/lookup?id=${encodeURIComponent(trackId)}&entity=song&country=US`;

  const response = await fetch(lookupUrl);
  if (!response.ok) {
    throw new Error(`iTunes lookup failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  const item = (payload.results || []).find((result) => result.trackId === Number(trackId));

  return item ? mapItunesTrack(item) : null;
}
