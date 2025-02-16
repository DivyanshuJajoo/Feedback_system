import UserModel from "./user.model.js";
import jwt from "jsonwebtoken";
import userRepository from "./user.repository.js";
import bcrypt from "bcrypt";
import { getDB } from "../../config/postgreSQL.js";
import subjectRepository from "../subject/subject.repositary.js";
import branchRepository from "../branch_sub/branch.repositary.js";
import feedbackRepository from "../feedback/feedback.repositary.js";
import passport from "passport";
import { Strategy } from "passport-local";
const LocalStrategy = Strategy;
import session from "express-session";



// app.use(passport.initialize());
// app.use(passport.session());
export default class UserController {
  constructor() {
    (this.userRepo = new userRepository()),
    (this.subjectRepo = new subjectRepository()),
    (this.feedbackRepo = new feedbackRepository()),
      (this.branchRepo = new branchRepository());
  }

 
  
  async login(req, res) {

    // console.log(req.body);
    let user;
    passport.use(
      new LocalStrategy(async (username, password, done) => {
        console.log(username);
        user = await this.userRepo.signIn(username, password);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      })
    );

    let flag=true;
    passport.authenticate("local", (err, user, info) => {
      if (err) {
          return res.render("login", { message: "Something went wrong. Please try again." });
      }
      if (!user) {
          return res.render("login", { message: "Incorrect username or password" });
      }

      req.logIn(user, async (loginErr) => {
          if (loginErr) {
              return res.render("login", { message: "Login failed. Please try again." });
          }

          // Redirect user based on role
          if (user.role === "Student") {
            if(user.is_allowed==false){
              res.render("login", { message: "The feedback form is currently unavailable for your semester"});
            }
            else{
              if(user.has_filled===false){
                const branch_name = user.branch_name;
                const uniqueId=user.uniqueid;
                const semester=user.semester;
                const discipline_id=user.discipline_id;
                  const year = user.year;
                  const subjects = await this.branchRepo.fetchSubjects(semester,discipline_id,uniqueId,branch_name, year);
                  console.log(subjects);
                  const faculties = await this.subjectRepo.fetchfaculties(subjects,user.section);
                  const questionsArray = [
                    "How would you rate the clarity of the instructor's explanations?",
                    "Did the instructor effectively engage with the students?",
                    "Were the course materials organized and easy to follow?",
                    "Did the instructor provide helpful feedback on assignments?",
                    "How approachable was the instructor for questions and assistance?",
                    "Did the instructor encourage active participation in class discussions?",
                    "Did the instructor demonstrate a good understanding of the subject matter?",
                    "Was the pace of the course appropriate for learning?",
                    "Did the instructor encourage critical thinking and problem-solving?",
                    "Overall, how satisfied are you with the instructor's teaching?"
                ];
                  console.log("Subjects outside:", subjects);
                  console.log("faculties:", faculties);
                  // res.send("asdmfklsvjbhskalj");
                  res.render('feedback',{ subjects, faculties,questionsArray ,uniqueId});
              }
              else{
                res.render("login", { message: "You have already filled the feedback"});
              }
            }
            
          } else if(user.role == "faculty") {
            const uniqueid=user.uniqueid;
            const feedbacks=await this.feedbackRepo.fetchfeedback(uniqueid);
            console.log(feedbacks);
            return res.render("dashboard",{feedbacks});
          }
          else if(user.role == "admin"){
            req.session.adminDetails = {
              discipline: user.discipline_id,
              branch_name: user.branch_name,
            };
            console.log(req.session.adminDetails);
            return res.render("admin", { discipline: user.discipline_id, branch_name: user.branch_name });
          
          }
      });
  })(req, res);
}



    // passport.authenticate("local")(req, res, async() => {
    //   console.log(user);
    //   if (!user) {
    //           // Authentication failed, redirect to login page with error message
    //           return res.redirect("/login?error=auth");
    //         }
    //         // Authentication successful, check user's rrole and redirect accordingly
    //         if (user.role === "Student") {
    //           if(user.is_allowed==false){
    //             res.send("The feedback form is currently unavailable for your semester");
    //           }
    //           else{
    //             if(user.has_filled===false){
    //               const branch_name = user.branch_name;
    //               const uniqueId=user.uniqueid;
    //               const semester=user.semester;
    //               const discipline_id=user.discipline_id;
    //                 const year = user.year;
    //                 const subjects = await this.branchRepo.fetchSubjects(semester,discipline_id,uniqueId,branch_name, year);
    //                 console.log(subjects);
    //                 const faculties = await this.subjectRepo.fetchfaculties(subjects,user.section);
    //                 const questionsArray = [
    //                   "How would you rate the clarity of the instructor's explanations?",
    //                   "Did the instructor effectively engage with the students?",
    //                   "Were the course materials organized and easy to follow?",
    //                   "Did the instructor provide helpful feedback on assignments?",
    //                   "How approachable was the instructor for questions and assistance?",
    //                   "Did the instructor encourage active participation in class discussions?",
    //                   "Did the instructor demonstrate a good understanding of the subject matter?",
    //                   "Was the pace of the course appropriate for learning?",
    //                   "Did the instructor encourage critical thinking and problem-solving?",
    //                   "Overall, how satisfied are you with the instructor's teaching?"
    //               ];
    //                 console.log("Subjects outside:", subjects);
    //                 console.log("faculties:", faculties);
    //                 // res.send("asdmfklsvjbhskalj");
    //                 res.render('feedback',{ subjects, faculties,questionsArray ,uniqueId});
    //             }
    //             else{
    //               res.send("You have already filled the feedback");
    //             }
    //           }
              
    //         } else if(user.role == "faculty") {
    //           const uniqueid=user.uniqueid;
    //           const feedbacks=await this.feedbackRepo.fetchfeedback(uniqueid);
    //           console.log(feedbacks);
    //           return res.render("dashboard",{feedbacks});
    //         }
    //         else if(user.role == "admin"){
    //           req.session.adminDetails = {
    //             discipline: user.discipline_id,
    //             branch_name: user.branch_name,
    //           };
    //           console.log(req.session.adminDetails);
    //           return res.render("admin", { discipline: user.discipline_id, branch_name: user.branch_name });
            
    //         }
    // });
  // }
}


