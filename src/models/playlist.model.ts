import mongoose from "mongoose";

const trackItemSchema = new mongoose.Schema(
  {
    trackId: {
      type: Number,
      required: true
    },
    trackName: {
      type: String,
      required: true,
      trim: true
    },
    artistName: {
      type: String,
      default: "",
      trim: true
    },
    artworkUrl100: {
      type: String,
      default: ""
    },
    trackViewUrl: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },
    trackItems: {
      type: [trackItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

playlistSchema.index({ ownerId: 1, createdAt: -1 });
playlistSchema.index({ isPublic: 1, createdAt: -1 });

export const Playlist = mongoose.model("Playlist", playlistSchema);
