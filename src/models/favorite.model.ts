import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    appleTrackId: {
      type: Number,
      required: true,
      index: true
    },
    trackName: {
      type: String,
      required: true,
      trim: true
    },
    artistName: {
      type: String,
      required: true,
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
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

favoriteSchema.index({ userId: 1, appleTrackId: 1 }, { unique: true });

export const Favorite = mongoose.model("Favorite", favoriteSchema);
