import bcrypt from "bcryptjs";
import { User, USERNAME_REGEX } from "../models/user.model.js";
import { fail, ok } from "../middlewares/response.js";

function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    isActive: user.isActive
  };
}

export async function register(req, res) {
  try {
    const { username, email, password, displayName = "" } = req.body || {};

    if (!username || !email || !password) {
      return res.status(200).json(fail(1001, "username, email and password are required"));
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(200).json(fail(1001, "username must be 3-24 chars with letters/numbers/underscore"));
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(200).json(fail(1001, "password must be at least 6 chars"));
    }

    const existsByUsername = await User.findOne({ username });
    if (existsByUsername) {
      return res.status(200).json(fail(10001, "username already exists"));
    }

    const existsByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existsByEmail) {
      return res.status(200).json(fail(10002, "email already exists"));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      role: "LISTENER"
    });

    req.session.userId = String(created._id);

    return res.status(200).json(ok({ user: toPublicUser(created) }, "registered"));
  } catch (error) {
    return res.status(200).json(fail(1004, "internal server error"));
  }
}

export async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body || {};

    if (!usernameOrEmail || !password) {
      return res.status(200).json(fail(1001, "usernameOrEmail and password are required"));
    }

    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: String(usernameOrEmail).toLowerCase() }]
    });

    if (!user) {
      return res.status(200).json(fail(1002, "invalid credentials"));
    }

    if (!user.isActive) {
      return res.status(200).json(fail(10003, "account is disabled"));
    }

    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) {
      return res.status(200).json(fail(1002, "invalid credentials"));
    }

    req.session.userId = String(user._id);

    return res.status(200).json(ok({ user: toPublicUser(user) }, "logged in"));
  } catch (error) {
    return res.status(200).json(fail(1004, "internal server error"));
  }
}

export async function logout(req, res) {
  req.session.destroy(() => {
    res.status(200).json(ok({}, "logged out"));
  });
}

export async function me(req, res) {
  try {
    if (!req.session.userId) {
      return res.status(200).json(fail(1002, "login required"));
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(200).json(fail(1002, "login required"));
    }

    if (!user.isActive) {
      return res.status(200).json(fail(10003, "account is disabled"));
    }

    return res.status(200).json(ok({ user: toPublicUser(user) }));
  } catch (error) {
    return res.status(200).json(fail(1004, "internal server error"));
  }
}
