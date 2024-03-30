import express from "express";
import UserController from "./user.controller.js";
const userController = new UserController();
const userRoute = express.Router();

// userRoute.post("/signUp", (req, res) => {
//   userController.signUp(req, res);
// });
userRoute.post("/login", (req, res) => {
  userController.login(req, res);
});


// userRoute.post("/feedback", (req,res) => {
//   userController.feedback(req,res);
// } )
// userRoute.get("/feedback",(req,res)=>{
//   userController.feedback(req,res);
// });

export default userRoute;
