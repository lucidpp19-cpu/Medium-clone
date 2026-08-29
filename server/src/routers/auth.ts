import express from "express";
import {
  emailLogin,
  googleAuth,
  logout,
  tokenRefresh,
} from "../controllers/auth.controller";
const router = express.Router();

router.route("/email").post(emailLogin);
router.route("/google/oauth").get(googleAuth);

router.route("/logout").post(logout);

router.route("/token").post(tokenRefresh);

export default router;
