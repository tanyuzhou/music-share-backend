import mongoose from "mongoose";

const ROLES = ["LISTENER", "MODERATOR", "SUPER_ADMIN"];
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: USERNAME_REGEX
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ROLES,
      default: "LISTENER",
      index: true
    },
    displayName: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: ""
    },
    favoriteGenre: {
      type: String,
      default: ""
    },
    favoritesVisibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
export { USERNAME_REGEX, ROLES };
