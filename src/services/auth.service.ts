import type { PrismaClient } from "@prisma/client";

import { comparePassword, hashPassword } from "../utils/hash.js";

import {
  generateAccessToken,
  generateRefreshToken,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  verifyRefreshToken,
} from "../utils/jwt.js";

import type {
  LoginInput,
  RefreshInput,
  SignupInput,
} from "../validators/auth.validator.js";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const userSelect = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  avatar: true,
  bio: true,
  github: true,
  twitter: true,
  website: true,
  reputationScore: true,
  createdAt: true,
} as const;

const getRefreshTokenExpiry = () =>
  new Date(
    Date.now() +
      REFRESH_TOKEN_MAX_AGE_SECONDS * 1000
  );

const createTokenPair = async (
  prisma: PrismaClient,
  userId: string
) => {
  const accessToken =
    generateAccessToken(userId);

  const refreshToken =
    generateRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};

const findUserProfile = async (
  prisma: PrismaClient,
  userId: string
) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: userSelect,
  });
};

export const signupUser = async (
  prisma: PrismaClient,
  input: SignupInput
) => {

  const [
    existingUsername,
    existingEmail,
  ] = await Promise.all([

    prisma.user.findUnique({
      where: {
        username: input.username,
      },
    }),

    prisma.user.findUnique({
      where: {
        email: input.email,
      },
    }),

  ]);

  if (existingUsername) {
    throw new AuthError(
      "Username is already taken",
      409
    );
  }

  if (existingEmail) {
    throw new AuthError(
      "Email is already registered",
      409
    );
  }

  const hashedPassword =
    await hashPassword(input.password);

  const user = await prisma.user.create({

    data: {
      username: input.username,
      email: input.email,
      password: hashedPassword,
      displayName: input.displayName,
    },

    select: userSelect,

  });

  const tokens =
    await createTokenPair(
      prisma,
      user.id
    );

  return {
    user,
    ...tokens,
  };
};

export const loginUser = async (
  prisma: PrismaClient,
  input: LoginInput
) => {

  const user =
    await prisma.user.findUnique({

      where: {
        email: input.email,
      },

    });

  if (!user) {
    throw new AuthError(
      "Invalid email or password",
      401
    );
  }

  const validPassword =
    await comparePassword(
      input.password,
      user.password
    );

  if (!validPassword) {
    throw new AuthError(
      "Invalid email or password",
      401
    );
  }

  const profile =
    await findUserProfile(
      prisma,
      user.id
    );

  if (!profile) {
    throw new AuthError(
      "User not found",
      404
    );
  }

  const tokens =
    await createTokenPair(
      prisma,
      user.id
    );

  return {
    user: profile,
    ...tokens,
  };
};
export const logoutUser = async (
  prisma: PrismaClient,
  refreshToken?: string
) => {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.deleteMany({
    where: {
      token: refreshToken,
    },
  });
};

export const refreshUserToken = async (
  prisma: PrismaClient,
  input: RefreshInput
) => {

  const refreshToken = input.refreshToken;

  if (!refreshToken) {
    throw new AuthError(
      "Refresh token is required",
      401
    );
  }

  let payload: { userId: string };

  try {

    payload =
      verifyRefreshToken(refreshToken);

  } catch {

    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });

    throw new AuthError(
      "Invalid refresh token",
      401
    );
  }

  const storedToken =
    await prisma.refreshToken.findUnique({

      where: {
        token: refreshToken,
      },

    });

  if (!storedToken) {
    throw new AuthError(
      "Invalid refresh token",
      401
    );
  }

  if (
    storedToken.userId !== payload.userId
  ) {
    throw new AuthError(
      "Invalid refresh token",
      401
    );
  }

  if (
    storedToken.expiresAt.getTime() <=
    Date.now()
  ) {

    await prisma.refreshToken.delete({

      where: {
        id: storedToken.id,
      },

    });

    throw new AuthError(
      "Refresh token expired",
      401
    );
  }

  const user =
    await findUserProfile(
      prisma,
      payload.userId
    );

  if (!user) {

    await prisma.refreshToken.delete({

      where: {
        id: storedToken.id,
      },

    });

    throw new AuthError(
      "User not found",
      404
    );
  }

  const accessToken =
    generateAccessToken(user.id);

  const newRefreshToken =
    generateRefreshToken(user.id);

  await prisma.$transaction([

    prisma.refreshToken.delete({
      where: {
        id: storedToken.id,
      },
    }),

    prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt:
          getRefreshTokenExpiry(),
      },
    }),

  ]);

  return {
    user,
    accessToken,
    refreshToken: newRefreshToken,
  };
};
export const getCurrentUser = async (
  prisma: PrismaClient,
  userId: string
) => {
  const user = await findUserProfile(
    prisma,
    userId
  );

  if (!user) {
    throw new AuthError(
      "User not found",
      404
    );
  }

  return user;
};