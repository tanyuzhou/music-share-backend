import { ok, fail } from "../middlewares/response.js";
import { Playlist } from "../models/playlist.model.js";
import { Review } from "../models/review.model.js";
import { User } from "../models/user.model.js";
import { Favorite } from "../models/favorite.model.js";
import { lookupTrack } from "../utils/itunes.js";

function toPlaylistDto(playlist: any) {
  const owner = playlist.ownerId || {};
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
    createdAt: playlist.createdAt
  };
}

function toReviewDto(review: any) {
  const author = review.authorId || {};
  return {
    id: review._id,
    appleTrackId: review.appleTrackId,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt,
    author: {
      id: author._id,
      username: author.username,
      displayName: author.displayName
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
    const dto = toReviewDto(review);
    const track = trackMap.get(Number(review.appleTrackId));
    return {
      ...dto,
      trackName: track?.trackName || "",
      artistName: track?.artistName || "",
      artworkUrl100: track?.artworkUrl100 || ""
    };
  });
}

export async function getPublicHomeFeed(req: any, res: any) {
  try {
    const [playlists, reviews, users] = await Promise.all([
      Playlist.find({ isPublic: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("ownerId", "username displayName")
        .lean(),
      Review.find({ status: "PUBLISHED" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("authorId", "username displayName")
        .lean(),
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("username displayName role createdAt")
        .lean()
    ]);

    const reviewsWithTrack = await attachReviewTrackMeta(reviews);

    return res.status(200).json(
      ok({
        latestPublicPlaylists: playlists.map(toPlaylistDto),
        latestReviews: reviewsWithTrack,
        latestUsers: users.map((u: any) => ({
          id: u._id,
          username: u.username,
          displayName: u.displayName,
          role: u.role,
          createdAt: u.createdAt
        }))
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to load home feed"));
  }
}

export async function getMyHomeFeed(req: any, res: any) {
  try {
    const userId = req.authUser._id;

    const [myReviews, myPlaylists, myFavorites] = await Promise.all([
      Review.find({ authorId: userId, status: "PUBLISHED" }).sort({ createdAt: -1 }).limit(5).lean(),
      Playlist.find({ ownerId: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Favorite.find({ userId }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const myReviewsWithTrack = await attachReviewTrackMeta(myReviews);

    return res.status(200).json(
      ok({
        myRecentReviews: myReviewsWithTrack,
        myRecentPlaylists: myPlaylists.map((p: any) => ({
          id: p._id,
          title: p.title,
          isPublic: p.isPublic,
          createdAt: p.createdAt
        })),
        myRecentFavorites: myFavorites.map((f: any) => ({
          id: f._id,
          appleTrackId: f.appleTrackId,
          trackName: f.trackName,
          artistName: f.artistName,
          artworkUrl100: f.artworkUrl100 || "",
          createdAt: f.createdAt
        }))
      })
    );
  } catch (error) {
    return res.status(200).json(fail(1004, "failed to load personal home feed"));
  }
}
