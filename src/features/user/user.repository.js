import { getDB } from "../../config/postgreSQL.js";
import subjectRepository from "../subject/subject.repositary.js";
import branchRepository from "../branch_sub/branch.repositary.js";

export default class userRepository {
  constructor() {
    (this.collection = "User"),
      (this.subjectRepo = new subjectRepository()),
      (this.branchRepo = new branchRepository());
  }

  // async signUp(newUser) {
  //   try {
  //     const db = getDB();
  //     const collection = db.collection(this.collection);
  //     await collection.insertOne(newUser);
  //     return newUser;
  //   } catch (err) {
  //     throw new ApplicationError("something went wrong", 500);
  //   }
  // }

  async signIn(uniqueID, password) {
    // console.log("1111"+uniqueID);
    
    try {
      const db = getDB();
      const result = await db.query("SELECT * FROM users WHERE uniqueid=$1", [
        uniqueID,
      ]);
      // console.log(result);
      // console.log("User data from database:", result.rows);
      return result.rows[0];
      // if (result.rowCount > 0) {
      //   return result;
      //   const user = result.rows[0];
      //   const storedpassword = user.password;

      //   // console.log(password);
      //   // console.log(storedpassword);

      //   if (password === storedpassword) {
      //     return user;
      //     const role = user.role;
      //     //  return "login succesful";
      //     if (role === "Student") { 
          


      //       ///////
      //       const branch_name = user.branch;
      //       const year = user.year;
      //       const subjects = await this.branchRepo.fetchSubjects(branch_name, year);
      //       const faculties = await this.subjectRepo.fetchfaculties(subjects);
      //       console.log("Subjects outside:", subjects);
      //       console.log("faculties:", faculties);
      //       return "feedback", { subjects, faculties };
      //     } else {
      //       return "dashboard";
      //     }
      //   } else {
      //     return "INCORRECT LOGIN CREDENTIALS";
      //   }
      // } else {
      //   return "USER NOT FOUND";
      // }
    } catch (e) {
      // throw new ApplicationError("something went wrong", 500);
      console.log(e);
    }
  }


  async findByuniqueid(uniqueid) {
    try {
      const db = getDB();
      const result = await db.query("SELECT * FROM users WHERE uniqueid=$1", [
        uniqueid,
      ]);
      // console.log(result);

      if (result.rowCount > 0) {
        return result.rows[0]; // Return the first row (assuming ID is unique)
      } else {
        return null; // User not found
      }
    } catch (error) {
      console.error("Error fetching user by uniqueid:", error);
      throw error;
    }
  }
}
