import jwt from "jsonwebtoken";
import { findUserById } from "../services/user.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { throwError } from "../utils/response.js";
import { config } from "../config/env.js";

export const tokenDecode = async (req) => {
  const authorizationHeader = req.headers["authorization"];
  if (!authorizationHeader) return null;

  const token = authorizationHeader.split(" ")[1];
  if (!token) return null;

  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    const tokenDecoded = await tokenDecode(req);
    
    if (!tokenDecoded) {
      throwError("Unauthenticated", HTTP_STATUS.UNAUTHENTICATED);
    }

    const user = await findUserById(tokenDecoded.id);
    if (!user) {
      throwError("User not found", HTTP_STATUS.UNAUTHENTICATED);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
