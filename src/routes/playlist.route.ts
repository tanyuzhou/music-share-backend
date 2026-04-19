import { Router } from "express";
import { requireLogin } from "../middlewares/auth.js";
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  listMyPlaylists,
  listPublicPlaylists,
  listUserPublicPlaylists,
  removeTrackFromPlaylist,
  updatePlaylist
} from "../controllers/playlist.controller.js";

const playlistRouter = Router();

playlistRouter.get("/playlists/public", listPublicPlaylists);
playlistRouter.get("/playlists/:playlistId", getPlaylistById);
playlistRouter.get("/users/:userId/playlists/public", listUserPublicPlaylists);
playlistRouter.get("/users/me/playlists", requireLogin, listMyPlaylists);
playlistRouter.post("/playlists", requireLogin, createPlaylist);
playlistRouter.put("/playlists/:playlistId", requireLogin, updatePlaylist);
playlistRouter.delete("/playlists/:playlistId", requireLogin, deletePlaylist);
playlistRouter.post("/playlists/:playlistId/tracks", requireLogin, addTrackToPlaylist);
playlistRouter.delete("/playlists/:playlistId/tracks/:trackId", requireLogin, removeTrackFromPlaylist);

export default playlistRouter;
