import mongoose from "mongoose";

const REVIEW_STATUSES = ["PUBLISHED", "HIDDEN_BY_MOD", "DELETED_BY_ADMIN"];

const reviewSchema = new mongoose.Schema(
  {
    appleTrackId: {
      type: Number,
      required: true,
      index: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "PUBLISHED",
      index: true
    },
    moderationReason: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ appleTrackId: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
