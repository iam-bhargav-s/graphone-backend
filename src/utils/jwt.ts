import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

export type JwtPayload = {
  userId: string;
};

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";
export const ACCESS_TOKEN_EXPIRES_IN = "15m";
export const REFRESH_TOKEN_EXPIRES_IN = "30d";
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const getEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
};

const signJwt = (
  payload: JwtPayload,
  secret: string,
  expiresIn: NonNullable<SignOptions["expiresIn"]>
) => {
  const options: SignOptions = { expiresIn };

  return jwt.sign(payload, secret, options);
};

const verifyJwt = (token: string, secret: string): JwtPayload => {
  const payload = jwt.verify(token, secret);

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.userId !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return { userId: payload.userId };
};

export const generateAccessToken = (userId: string) => {
  return signJwt(
    { userId },
    getEnv("JWT_ACCESS_SECRET"),
    ACCESS_TOKEN_EXPIRES_IN
  );
};

export const generateRefreshToken = (userId: string) => {
  return signJwt(
    { userId },
    getEnv("JWT_REFRESH_SECRET"),
    REFRESH_TOKEN_EXPIRES_IN
  );
};

export const verifyAccessToken = (token: string) => {
  return verifyJwt(token, getEnv("JWT_ACCESS_SECRET"));
};

export const verifyRefreshToken = (token: string) => {
  return verifyJwt(token, getEnv("JWT_REFRESH_SECRET"));
};
