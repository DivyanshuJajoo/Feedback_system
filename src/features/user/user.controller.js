import UserModel from "./user.model.js";
import jwt from "jsonwebtoken";
import userRepository from "./user.repository.js";
import bcrypt from "bcrypt";
import { getDB } from "../../config/postgreSQL.js";
import subjectRepository from "../subject/subject.repositary.js";
import branchRepository from "../branch_sub/branch.repositary.js";
// import passport from "passport";
// import { Strategy } from "passport-local";
// import session from "express-session";

// app.use(
//   session({
//     secret: "TOPSECRETWORD",
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// app.use(passport.initialize());
// app.use(passport.session());
export default class UserController {
  constructor() {
    (this.userRepo = new userRepository()),
    (this.subjectRepo = new subjectRepository()),
      (this.branchRepo = new branchRepository());
  }

  // async feedback(req,res){
  //   if (req.isAuthenticated()) {
  //     res.render("feedback.ejs");
  //   } else {
  //     res.redirect("/login");
  //   }
  // }

  // async login(
  //   passport.authenticate("local", {
  //   successRedirect: "/feedback",
  //   failureRedirect: "/login",
  // }));

  // passport.use(
  //   new Strategy(async function verify(username, password, cb) {


  //     const uniqueid = req.body.uniqueid;
  //     const password = req.body.password;
  //     const body = req.body;
  //     const result = await this.userRepo.signIn(uniqueid, password);
  //     if (result.rowCount > 0) {
  //         const user = result.rows[0];
  //         const storedpassword = user.password;

  //         // console.log(password);
  //         // console.log(storedpassword);

  //         if (password === storedpassword) {
  //           // return user;
  //           const role = user.role;
  //           //  return "login succesful";
  //           if (role === "Student") {
  //             const branch_name = user.branch;
  //             const year = user.year;
  //             const subjects = await this.branchRepo.fetchSubjects(branch_name, year);
  //             const faculties = await this.subjectRepo.fetchfaculties(subjects);
  //             // console.log("Subjects outside:", subjects);
  //             // console.log("faculties:", faculties);
  //             return cb('feedback',{ subjects, faculties });
  //           } else {
  //             return cb('feedback');
  //           }
  //         } else {
  //           return cb("Incorrect Login Credentials");
  //         }
  //       }
  //       else res.send("USER NOT FOUND");


      // try {
      //   const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
      //     username,
      //   ]);
      //   if (result.rows.length > 0) {
      //     const user = result.rows[0];
      //     const storedHashedPassword = user.password;
      //     bcrypt.compare(password, storedHashedPassword, (err, valid) => {
      //       if (err) {
      //         //Error with password check
      //         console.error("Error comparing passwords:", err);
      //         return cb(err);
      //       } else {
      //         if (valid) {
      //           //Passed password check
      //           return cb(null, user);
      //         } else {
      //           //Did not pass password check
      //           return cb(null, false);
      //         }
      //       }
      //     });
      //   } else {
      //     return cb("User not found");
      //   }
      // } catch (err) {
      //   console.log(err);
      // }
  //   })
  // );
  
  

  async login(req, res) {
    const uniqueid = req.body.uniqueid;
    const password = req.body.password;
    // const body = req.body;
    const result = await this.userRepo.signIn(uniqueid, password);
    if (result.rowCount > 0) {
        const user = result.rows[0];
        const storedpassword = user.password;
        const section=user.section;

        // console.log(password);
        // console.log(storedpassword);

        if (password === storedpassword) {
          // return user;
          const role = user.role;
          //  return "login succesful";
          if (role === "Student") {
            const branch_name = user.branch;
            const year = user.year;
            const subjects = await this.branchRepo.fetchSubjects(branch_name, year);
            const faculties = await this.subjectRepo.fetchfaculties(subjects,section);
            console.log("Subjects outside:", subjects);
            console.log("faculties:", faculties);
            res.render('feedback',{ subjects, faculties });
          } else {
            res.render('dashboard');
          }
        } else {
          res.send("Incorrect Login Credentials");
        }
      }
      else res.send("USER NOT FOUND");
    
  }


  async feedback(req,res){
    const subject=req.body.subject;
    const faculty=req.body.faculty;

    subjects = subjects.filter(s => s !== subject);
    faculties = faculties.filter(f => f !== faculty);
    if (!faculties || faculties.length === 0) {
      res.send("Success");
      return res.redirect('/login');
  }

    res.redirect('/feedback');
  }

}


