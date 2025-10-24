import { HTTP_STATUS } from "./constant.js";
import { AppError } from "../middlewares/errorHandler.js";

export const sendSuccess = (res, data, message = "Success", statusCode = HTTP_STATUS.SUCCESS) => {
  res.status(statusCode).json({
    success: true,
    status: statusCode,
    message,
    data,
  });
};

export const sendError = (res, error) => {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: error.message,
  });
};

export const throwError = (message, statusCode = HTTP_STATUS.BAD_REQUEST) => {
  throw new AppError(message, statusCode);
};

export const sendWarning = (res, message) => {
  res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    status: HTTP_STATUS.BAD_REQUEST,
    message,
  });
};

export const sendUnauthenticated = (res) => {
  res.status(HTTP_STATUS.UNAUTHENTICATED).json({
    success: false,
    status: HTTP_STATUS.UNAUTHENTICATED,
    message: "Unauthenticated",
  });
};

export const sendNotFound = (res, message) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    status: HTTP_STATUS.NOT_FOUND,
    message,
  });
};

export const sendConflict = (res, message) => {
  res.status(HTTP_STATUS.CONFLICT).json({
    success: false,
    status: HTTP_STATUS.CONFLICT,
    message,
  });
};

