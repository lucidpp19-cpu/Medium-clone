import asyncHandler from "express-async-handler";
import axios from "axios";
import User from "../models/user";
import jwt from "jsonwebtoken";
import qs from "qs";
import env from "../utils/envalid";
import Token from "../models/token";
import { JWTPayload } from "../middlewares/auth";
import ServerError from "../utils/ServerError";
import bcrypt from "bcryptjs";

function createAuthTokens(userId: string) {
  return {
    access_token: jwt.sign({ _id: userId }, env.JWT_SECRET, { expiresIn: "30m" }),
    refresh_token: jwt.sign({ _id: userId }, env.JWT_REFRESH_SECRET),
  };
}

export const emailLogin = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    throw new ServerError(400, "Enter a valid email and a password with at least 8 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  if (name) {
    if (existingUser) throw new ServerError(409, "An account with this email already exists");
    const user = await User.create({
      email: normalizedEmail,
      name: String(name).trim().slice(0, 80) || normalizedEmail.split("@")[0],
      passwordHash: await bcrypt.hash(password, 12),
      lists: [{ name: "Reading list", posts: [], images: [] }],
    });
    const tokens = createAuthTokens(String(user._id));
    await Token.create({ token: tokens.refresh_token });
    res.status(201).json({ user, ...tokens });
    return;
  }

  if (!existingUser?.passwordHash || !(await bcrypt.compare(password, existingUser.passwordHash))) {
    throw new ServerError(401, "Invalid email or password");
  }
  const tokens = createAuthTokens(String(existingUser._id));
  await Token.create({ token: tokens.refresh_token });
  res.json({ user: existingUser, ...tokens });
});

export const tokenRefresh = asyncHandler((req, res, next) => {
  const { token } = req.body;
  const decoded = <JWTPayload>jwt.verify(token, env.JWT_REFRESH_SECRET);
  const access_token = jwt.sign({ _id: decoded._id }, env.JWT_SECRET, {
    expiresIn: "30m",
  });
  res.json({ access_token });
});

export const logout = asyncHandler(async (req, res, next) => {
  const { refresh_token } = req.body;
  console.log(refresh_token);

  const loggedOut = await Token.deleteOne({ token: refresh_token });
  if (!loggedOut.deletedCount)
    throw new ServerError(400, "Something went wrong!");
  res.json({ message: "logged out succesfully" });
});

export const googleAuth = asyncHandler(async (req, res, next) => {
  const { id_token, access_token } = await getUserFromCode(
    req.query.code as string
  );
  const user = await userDetails(access_token, id_token);
  let isUser: any = await User.findOne({ email: user.email });
  if (!isUser) {
    const temp = new User({
      name: user.name,
      email: user.email,
      avatar:
        user.picture ??
        "https://firebasestorage.googleapis.com/v0/b/upload-pics-e599e.appspot.com/o/images%2F1_dmbNkD5D-u45r44go_cf0g.png?alt=media&token=3ef51503-f601-448b-a55b-0682607ddc8a",
      lists: [
        {
          name: "Reading list",
          posts: [],
          images: [],
        },
      ],
    });
    isUser = await temp.save();
  }
  const access_token_server = jwt.sign({ _id: isUser._id }, env.JWT_SECRET, {
    expiresIn: "30m",
  });
  const refresh_token_server = jwt.sign(
    { _id: isUser._id },
    env.JWT_REFRESH_SECRET
  );
  const refToken = new Token({
    token: refresh_token_server,
  });
  await refToken.save();
  res.redirect(
    `${env.CLIENT_URL}/oauth/redirect?uid=${isUser._id}&access_token=${access_token_server}&refresh_token=${refresh_token_server}`
  );
});

async function getUserFromCode(code: string) {
  const url = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: env.clientid,
    client_secret: env.clientsecret,
    redirect_uri: env.redirect_url,
    grant_type: "authorization_code",
  };

  try {
    const res = await axios.post(url, qs.stringify(values), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return res.data;
  } catch (error) {
    console.error(error);
  }
}

async function userDetails(access_token: string, id_token: string) {
  return axios
    .get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    )
    .then((res) => res.data)
    .catch((error) => {
      console.error(`Failed to fetch user`);
    });
}
