import express from "express";
import UserController from "./user.controller.js";
const userController = new UserController();
const userRoute = express.Router();

userRoute.post("/signUp", (req, res) => {
  userController.signUp(req, res);
});
userRoute.post("/signIn", (req, res) => {
  userController.signIn(req, res);
});
export default userRoute;
