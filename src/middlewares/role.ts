import { fail } from "./response.js";

export function requireRole(allowedRoles: string[]) {
  return function roleMiddleware(req, res, next) {
    const role = req.authUser?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(200).json(fail(1003, "permission denied"));
    }
    return next();
  };
}
