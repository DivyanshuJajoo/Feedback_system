import express, { query } from "express";
import dotenv from "dotenv";
import swagger from "swagger-ui-express";
import userRoute from "./src/features/user/user.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import pg from "pg"
import bcrypt from "bcrypt"
import session from "express-session";
import passport from "passport";
import methodOverride from "method-override";
import aiServices from "./aiServices.js";

dotenv.config();
import apiDocs from "./swagger_ver3.0.json" assert { type: "json" };
import { ApplicationError } from "./src/errorHandle/error.js";
import { connectToDB, getDB } from "./src/config/postgreSQL.js";
import loggerMiddleware from "./src/middleware/logger.middleware.js";
import jwtAuthProf from "./src/middleware/jwt.middleware.js";
import userRepository from "./src/features/user/user.repository.js";
const app = express();
const saltRounds=10;
app.set('view engine', 'ejs');
app.use(express.static("public"));

import multer from "multer"
import xlsx from "xlsx";
const upload = multer({ dest: 'uploads/' });
import fs from "fs";
import PDFDocument from 'pdfkit';
import PdfPrinter from "pdfmake";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(fileUpload());
app.use(methodOverride('_method'));
app.use('/downloads', express.static(path.join(__dirname, 'public')))

/////passport

app.use(
  session({
    secret: "asdfghjklqwert",
    resave: false,
    saveUninitialized: true,
    cookie:{
      maxAge:1000*60*60,
    }
  })
);

app.use(passport.initialize())
app.use(passport.session())


passport.serializeUser((user, done) => {
  // console.log(user);
  done(null, user.uniqueid);
});
passport.deserializeUser(async (id, done) => {
  // console.log(id);

  const repo = new userRepository();
  await repo.findByuniqueid(id).then((user) => {
    // console.log(user);
    done(null, user);
  });
});



////passport end

app.use(bodyParser.json({ type: "application/*+json" }));
app.use(bodyParser.urlencoded({ extended: false }))
var urlencodedParser = bodyParser.urlencoded({ extended: true });
app.use(cookieParser());
const port = process.env.PORT || 3000;
var corsOptions = {
  origin: "http://127.0.0.1:80",
  allowedHeaders: "*",
};
app.use(cors(corsOptions));


app.use(express.json());
app.use((err, res, req, next) => {
  console.log(err);
  if (err instanceof ApplicationError) {
    res.status(err.code).send(err.message);
  }
  res.status(500).send("Something went wrong,please try later");
});
app.use(loggerMiddleware);
app.use("/api/user/", userRoute);
app.use("/api-docs", swagger.serve, swagger.setup(apiDocs));

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
// const db = new pg.Client({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'Feedback',
//   password: 'Jajoo@2001',
//   port: 5432,
// });

// db.connect((err, Client, release) => {
//   if (err) {
//     return console.error('Error acquiring client', err.stack);
//   }
//   console.log('Connected to PostgreSQL database');
// });

app.get("/",checkNotAuthenticated, async(req, res) => {
  res.render('login.ejs', {
    message: 'Welcome to Login Page.' // Pass the message to the login page
  })
});
app.get("/login",checkNotAuthenticated, async(req, res) => {
  res.render('login.ejs', {
    message: 'Welcome to Login Page.' // Pass the message to the login page
  } )
});
app.get("/signup", async(req, res) => {
  res.render('signup')
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/feedback",
    failureRedirect: "/login",
  })
);

app.get("/feedback", checkAuthenticated, (req, res) => {
  if (!req.session.feedbackData) {
      return res.redirect("/login"); // Handle missing session data
  }

  const { subjects, faculties, questionsArray, uniqueId } = req.session.feedbackData;
  res.render("feedback", { subjects, faculties, questionsArray, uniqueId });

});


app.post('/submit-feedback', async (req, res) => {
  const db = getDB();
  const user = req.user;
  const uniqueid = user.uniqueid;
  const year = user.year;
  const section = user.section;
  const branch = user.branch_name;
  const discipline_id = user.discipline_id;
  const semester = user.semester; // Added semester
  let branch_id = null;

  if (branch) {
    const branchResult = await db.query(
      'SELECT branch_id FROM branchnew WHERE branch_name = $1',
      [branch]
    );
    branch_id = branchResult.rows.length ? branchResult.rows[0].branch_id : null;
  }

  const faculties = JSON.parse(req.body.faculties);
  const obj = JSON.parse(JSON.stringify(req.body)); 
  req.body = obj;
  console.log(req.body);

  const updateUserQuery = {
    text: `
      UPDATE users
      SET has_filled = TRUE
      WHERE uniqueid = $1
    `,
    values: [uniqueid]
  };
  await db.query(updateUserQuery);

  try {
    for (let i = 0; i < faculties.length; i++) {
      if (parseInt(req.body[`selectedPoint${i}-1`]) === 11) {
        console.log(`Feedback skipped for faculty: ${faculties[i].Assigned_faculty.id}`);
        continue; // Skip this faculty's feedback
      }

      const facultyFeedback = {};
      for (let j = 1; j <= 10; j++) {
        facultyFeedback[j] = req.body[`selectedPoint${i}-${j}`];
      }

      const feedbackData = {
        fac_id: faculties[i].Assigned_faculty.id,
        subject: faculties[i].subject,
        year: year,
        branch: branch,
        section: section,
        semester: semester,  // Added semester
        Q1: facultyFeedback[1],
        Q2: facultyFeedback[2],
        Q3: facultyFeedback[3],
        Q4: facultyFeedback[4],
        Q5: facultyFeedback[5],
        Q6: facultyFeedback[6],
        Q7: facultyFeedback[7],
        Q8: facultyFeedback[8],
        Q9: facultyFeedback[9],
        Q10: facultyFeedback[10],
        responses: 1,
        branch_id,
        discipline_id
      };

      const currentYear = new Date().getFullYear();
      console.log(currentYear);

      const existingFeedback = await db.query({
        text: `
          SELECT * FROM feedback
          WHERE fac_id = $1 AND subject = $2 AND year = $3 AND branch = $4 AND section = $5 
                AND Feedback_year = $6 AND branch_id = $7 AND discipline_id = $8 AND semester = $9
        `,
        values: [
          feedbackData.fac_id, feedbackData.subject, feedbackData.year, feedbackData.branch,
          feedbackData.section, currentYear, feedbackData.branch_id, feedbackData.discipline_id,
          feedbackData.semester // Added semester condition
        ]
      });

      if (existingFeedback.rows.length > 0) {
        // Update existing feedback entry
        const updateQuery = {
          text: `
            UPDATE feedback
            SET q1 = q1 + $6, q2 = q2 + $7, q3 = q3 + $8, q4 = q4 + $9, q5 = q5 + $10,
                q6 = q6 + $11, q7 = q7 + $12, q8 = q8 + $13, q9 = q9 + $14, q10 = q10 + $15,
                responses = responses + 1
            WHERE fac_id = $1 AND subject = $2 AND year = $3 AND branch = $4 AND section = $5 
                  AND branch_id = $16 AND discipline_id = $17 AND semester = $18
          `,
          values: [
            feedbackData.fac_id, feedbackData.subject, feedbackData.year, feedbackData.branch,
            feedbackData.section, feedbackData.Q1, feedbackData.Q2, feedbackData.Q3, feedbackData.Q4,
            feedbackData.Q5, feedbackData.Q6, feedbackData.Q7, feedbackData.Q8, feedbackData.Q9,
            feedbackData.Q10, feedbackData.branch_id, feedbackData.discipline_id, feedbackData.semester
          ]
        };
        await db.query(updateQuery);
      } else {
        // Insert new feedback entry
        const feedbackQuery = {
          text: `
            INSERT INTO feedback (fac_id, subject, year, branch, section, semester, q1, q2, q3, q4, q5, 
                                  q6, q7, q8, q9, q10, responses, feedback_year, branch_id, discipline_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          `,
          values: [
            feedbackData.fac_id, feedbackData.subject, feedbackData.year, feedbackData.branch,
            feedbackData.section, feedbackData.semester, feedbackData.Q1, feedbackData.Q2,
            feedbackData.Q3, feedbackData.Q4, feedbackData.Q5, feedbackData.Q6, feedbackData.Q7,
            feedbackData.Q8, feedbackData.Q9, feedbackData.Q10, feedbackData.responses,
            currentYear, feedbackData.branch_id, feedbackData.discipline_id
          ]
        };
        await db.query(feedbackQuery);
      }

      // Insert feedback remark in responses table
      const remark = req.body[`remark${i}`];
      const responseQuery = {
        text: `
          INSERT INTO responses (fac_id, subject, year, branch, section, semester, feedback_year, response, 
                                 branch_id, discipline_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        values: [
          feedbackData.fac_id, feedbackData.subject, feedbackData.year, feedbackData.branch,
          feedbackData.section, feedbackData.semester, currentYear, remark,
          feedbackData.branch_id, feedbackData.discipline_id
        ]
      };
      await db.query(responseQuery);
    }

    // Logout and redirect after feedback submission
    req.logout((err) => {
      if (err) return res.status(500).send('Error logging out');
      res.clearCookie('connect.sid'); // Clear session cookie

      // Redirect to login with success message
      res.render('login', {
        message: 'Feedback submitted successfully.'
      });
    });

  } catch (error) {
    console.error('Error while submitting feedback:', error);
    res.status(500).send('Internal Server Error');
  }
});









app.get('/collegeDetails',checkAuthenticated, (req, res) => {
  res.render('collegeDetails.ejs'); 
});
app.get('/admin', checkAuthenticated, (req, res) => {
  if (!req.session.adminDetails) {
      return res.redirect("/login"); // Handle missing session data
  }

  const { discipline, branch_name } = req.session.adminDetails;
  res.render('admin.ejs', { discipline, branch_name });
});




app.get('/accessing',checkAuthenticated, (req, res) => {
  res.render('accessing.ejs'); 
})

app.post("/signup", async(req, res) => { 
  const db= getDB();
  const unqique=req.body.uniqueid;
  const name=req.body.name;
  const password=req.body.password;
//   try{
//     const query=await db.query('SELECT * FROM users WHERE {unique}= uniqueid ');
  
//   if(query){
//  console.log("The user already exists");
//   }
//   else{
//     const query2= db.query('INSERT VALUES INTO COLUMNS("unique_id", "name" , "role" , "has_filled", "password", "branch_name", "year", "section") VALUES('{unqique} ,{name},"faculty", {password}, "branch_name", 1234,'1'')'),
//   }
//   console.log("The entries have been made. A new user is created.");
  res.render('login', { message: '' });

// }

  // console.log(email);

  // res.render('login')
});
//subjects
app.get('/subjects', checkAuthenticated, async (req, res) => {
  const db = getDB();
  const user = req.user; // Get the authenticated user's details
  const userDisciplineId = req.session.adminDetails.discipline || null;
  // console.log(userDiscipline);
  const userBranch = req.session.adminDetails.branch_name || null;
    let userBranchId = null;
    if (userBranch) {
      const branchResult = await db.query(
        'SELECT branch_id FROM branchnew WHERE branch_name = $1',
        [userBranch]
      );
      userBranchId = branchResult.rows.length ? branchResult.rows[0].branch_id : null;
    }

  try {
    let disciplinesResult = [];
    let branchesResult = [];
    let subjectsResult = [];

    if (userDisciplineId && userBranchId) {
      // Fetch data only for the user's discipline and branch
      disciplinesResult = await db.query('SELECT * FROM discipline WHERE id = $1', [userDisciplineId]);
      branchesResult = await db.query('SELECT * FROM branchnew WHERE branch_id = $1', [userBranchId]);
      subjectsResult = await db.query(`
        SELECT s.subject_id, s.name, d.name AS discipline_name, b.branch_name
        FROM subjectnew s
        JOIN branchnew b ON s.branch_id = b.branch_id
        JOIN discipline d ON b.discipline_id = d.id
        WHERE d.id = $1 AND b.branch_id = $2
      `, [userDisciplineId, userBranchId]);
    } else if (userDisciplineId) {
      // User has only discipline; show all branches and subjects for that discipline
      disciplinesResult = await db.query('SELECT * FROM discipline WHERE id = $1', [userDisciplineId]);
      branchesResult = await db.query('SELECT * FROM branchnew WHERE discipline_id = $1', [userDisciplineId]);
      subjectsResult = await db.query(`
        SELECT s.subject_id, s.name, d.name AS discipline_name, b.branch_name
        FROM subjectnew s
        JOIN branchnew b ON s.branch_id = b.branch_id
        JOIN discipline d ON b.discipline_id = d.id
        WHERE d.id = $1
      `, [userDisciplineId]);
    } else if (userBranchId) {
      // User has only branch; show all disciplines and subjects for that branch
      branchesResult = await db.query('SELECT * FROM branchnew WHERE branch_id = $1', [userBranchId]);
      disciplinesResult = await db.query(`
        SELECT * FROM discipline WHERE id IN (
          SELECT discipline_id FROM branchnew WHERE branch_id = $1
        )
      `, [userBranchId]);
      subjectsResult = await db.query(`
        SELECT s.subject_id, s.name, d.name AS discipline_name, b.branch_name
        FROM subjectnew s
        JOIN branchnew b ON s.branch_id = b.branch_id
        JOIN discipline d ON b.discipline_id = d.id
        WHERE b.branch_id = $1
      `, [userBranchId]);
    } else {
      // Both discipline_id and branch_id are null; show all data
      disciplinesResult = await db.query('SELECT * FROM discipline');
      branchesResult = await db.query('SELECT * FROM branchnew');
      subjectsResult = await db.query(`
        SELECT s.subject_id, s.name, d.name AS discipline_name, b.branch_name
        FROM subjectnew s
        JOIN branchnew b ON s.branch_id = b.branch_id
        JOIN discipline d ON b.discipline_id = d.id
      `);
    }

    // Render the page with the results
    res.render('subjects', {
      disciplines: disciplinesResult.rows, // Disciplines based on the user's data
      branches: branchesResult.rows, // Branches based on the user's data
      subjects: subjectsResult.rows, // Subjects based on the user's data
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


app.post('/subjects/add', async (req, res) => {
  const db = getDB();
  const { subject_name } = req.body;
  const branch_id = req.body.branch_id;
  const discipline_id = req.body.discipline_id;
  console.log(subject_name);
  console.log(branch_id);
  console.log(discipline_id);

  try {
    await db.query('INSERT INTO subjectnew (discipline_id, branch_id, name) VALUES ($1, $2, $3)', [discipline_id, branch_id, subject_name]);
    res.redirect('/subjects');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});



// Delete Subject Route
app.post('/subjects/delete/:id', async (req, res) => {
  console.log("1");
  const db= getDB();
  const { id } = req.params; // Ensure this matches :id in the route
  console.log("Deleting subject with ID:", id);

  try {
    const result = await db.query('DELETE FROM subjectnew WHERE subject_id = $1', [id]);
    console.log("Delete query executed", result);
    res.redirect('/subjects');
  } catch (err) {
    console.error("Error during deletion:", err);
    res.send("Error " + err);
  }
});


app.get('/subjects/edit/:id',checkAuthenticated, async (req, res) => {
  const db = getDB();
  const subjectId = req.params.id;
  try {
    const subjectResult = await db.query(`
      SELECT s.subject_id AS id, s.name AS subject_name, d.name AS discipline_name, b.branch_name, s.discipline_id, s.branch_id
      FROM subjectnew s
      JOIN branchnew b ON s.branch_id = b.branch_id
      JOIN discipline d ON s.discipline_id = d.id
      WHERE s.subject_id = $1
    `, [subjectId]);
    if (subjectResult.rows.length === 0) {
      return res.send('Subject not found');
    }
    const subject = subjectResult.rows[0];
    const disciplinesResult = await db.query('SELECT * FROM discipline');
    const branchesResult = await db.query('SELECT * FROM branchnew');
    res.render('edit_subject', {
      subject,
      disciplines: disciplinesResult.rows,
      branches: branchesResult.rows
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Handle form submission for editing subject
app.post('/subjects/edit/:id', async (req, res) => {
  const db = getDB();
  const subjectId = req.params.id;
  const { subject_name, branch_id } = req.body;
  console.log(subjectId);
  console.log(subject_name);
  console.log(branch_id);
  try {
    await db.query(`
      UPDATE subjectnew
      SET name = $1, branch_id = $2
      WHERE subject_id = $3
    `, [subject_name, branch_id, subjectId]);
    res.redirect('/subjects');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/subjects/upload', async (req, res) => {
  const db=getDB();
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const subjectFile = req.files.subjectFile;
  const uploadPath = path.join(__dirname, 'uploads', subjectFile.name);

  // Use the mv() method to place the file somewhere on your server
  subjectFile.mv(uploadPath, async (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    try {
      const workbook = xlsx.readFile(uploadPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      // Process data and insert into the database
      for (const row of data) {
        const { name, discipline_name, branch_name } = row;

        // Get discipline ID from discipline name
        const disciplineResult = await db.query('SELECT id FROM discipline WHERE name = $1', [discipline_name]);
        const discipline = disciplineResult.rows[0];

        // Get branch ID from branch name and discipline ID
        const branchResult = await db.query('SELECT branch_id FROM branchnew WHERE branch_name = $1 AND discipline_id = $2', [branch_name, discipline.id]);
        const branch = branchResult.rows[0];

        if (discipline && branch) {
          // Insert subject into the database
          await db.query('INSERT INTO subjectnew (name,  discipline_id, branch_id) VALUES ($1, $2, $3)', [name,  discipline.id, branch.branch_id]);
        } else {
          console.error(`Discipline or Branch not found for subject: ${name}`);
        }
      }

      // Delete the uploaded file after processing
      fs.unlinkSync(uploadPath);

      res.redirect('/subjects');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error processing the file: ' + err.message);
    }
  });
});




//discipline
app.get('/discipline',checkAuthenticated, async (req, res) => {
  const db=getDB();
  console.log("ok");
  try {
    const result = await db.query('SELECT * FROM discipline');
    res.render('discipline', { disciplines: result.rows });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/discipline/add', async (req, res) => {
  const db=getDB();
  const { discipline_name, duration } = req.body;
  try {
    await db.query('INSERT INTO discipline (name, duration) VALUES ($1, $2)', [discipline_name, duration]);
    res.redirect('/discipline');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/discipline/delete/:id', async (req, res) => {
  const db=getDB();
  const id = req.params.id;
  try {
    await db.query('DELETE FROM discipline WHERE id = $1', [id]);
    res.redirect('/discipline');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.get('/discipline/edit/:id', checkAuthenticated,async (req, res) => {
  const db=getDB();
  const id = req.params.id;
  try {
    const result = await db.query('SELECT * FROM discipline WHERE id = $1', [id]);
    res.render('editDiscipline', { discipline: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/discipline/edit/:id', async (req, res) => {
  const db=getDB();
  const id = req.params.id;
  const { discipline_name, duration } = req.body;
  try {
    await db.query('UPDATE discipline SET name = $1, duration = $2 WHERE id = $3', [discipline_name, duration, id]);
    res.redirect('/discipline');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


//For branches
// Route to display the branches page



app.get('/branches',checkAuthenticated, async (req, res) => {
  console.log("1");
  const db = getDB();
  try {
    const disciplinesResult = await db.query('SELECT * FROM discipline');
    const branchesResult = await db.query("SELECT b.*, d.name AS discipline_name FROM branchnew b JOIN discipline d ON b.discipline_id = d.id");

    console.log('Disciplines:', disciplinesResult.rows);
    console.log('Branches:', branchesResult.rows);

    res.render('branches', {
      disciplines: disciplinesResult.rows,
      branches: branchesResult.rows
    });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});



// Route to add a branch
app.post('/branches/add-branch', async (req, res) => {
  const db = getDB();
  const { discipline_id, branch_name } = req.body;
  try {
    await db.query('INSERT INTO branchnew (discipline_id, branch_name) VALUES ($1, $2)', [discipline_id, branch_name]);
    res.redirect('/branches');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});








// Route to delete a branch
app.post('/branches/delete/:branch_id', async (req, res) => {
  const db = getDB();
  const { branch_id } = req.params;
  try {
    await db.query('DELETE FROM branchnew WHERE branch_id = $1', [branch_id]);
    res.redirect('/branches');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});






//branch
// Route to display the faculty page
app.get('/faculty', checkAuthenticated, async (req, res) => {
  const db = getDB();
  const user = req.user; // Get authenticated user's details
  const userDisciplineId = req.session.adminDetails.discipline || null;
  // console.log(userDiscipline);
  const userBranch = req.session.adminDetails.branch_name || null;
    let userBranchId = null;
    if (userBranch) {
      const branchResult = await db.query(
        'SELECT branch_id FROM branchnew WHERE branch_name = $1',
        [userBranch]
      );
      userBranchId = branchResult.rows.length ? branchResult.rows[0].branch_id : null;
    }

  try {
    let disciplines = [];
    let branches = [];
    let faculties = [];

    if (userDisciplineId && userBranchId) {
      // Fetch data only for user's discipline and branch
      disciplines = (await db.query('SELECT * FROM discipline WHERE id = $1', [userDisciplineId])).rows;
      branches = (await db.query(
        `SELECT b.*, d.name AS discipline_name 
         FROM branchnew b 
         JOIN discipline d ON b.discipline_id = d.id 
         WHERE b.branch_id = $1`,
        [userBranchId]
      )).rows;
      faculties = (await db.query(
        `SELECT f.* 
         FROM faculty f 
         JOIN branchnew b ON f.branch_id = b.branch_id 
         WHERE b.branch_id = $1`,
        [userBranchId]
      )).rows;
    } else if (userDisciplineId) {
      // User has only discipline; fetch branches and faculties under this discipline
      disciplines = (await db.query('SELECT * FROM discipline WHERE id = $1', [userDisciplineId])).rows;
      branches = (await db.query(
        `SELECT b.*, d.name AS discipline_name 
         FROM branchnew b 
         JOIN discipline d ON b.discipline_id = d.id 
         WHERE d.id = $1`,
        [userDisciplineId]
      )).rows;
      faculties = (await db.query(
        `SELECT f.* 
         FROM faculty f 
         JOIN branchnew b ON f.branch_id = b.branch_id 
         JOIN discipline d ON b.discipline_id = d.id 
         WHERE d.id = $1`,
        [userDisciplineId]
      )).rows;
    } else if (userBranchId) {
      // User has only branch; fetch discipline and faculties under this branch
      branches = (await db.query(
        `SELECT b.*, d.name AS discipline_name 
         FROM branchnew b 
         JOIN discipline d ON b.discipline_id = d.id 
         WHERE b.branch_id = $1`,
        [userBranchId]
      )).rows;
      disciplines = (await db.query(
        `SELECT * 
         FROM discipline 
         WHERE id IN (SELECT discipline_id FROM branchnew WHERE branch_id = $1)`,
        [userBranchId]
      )).rows;
      faculties = (await db.query(
        `SELECT f.* 
         FROM faculty f 
         JOIN branchnew b ON f.branch_id = b.branch_id 
         WHERE b.branch_id = $1`,
        [userBranchId]
      )).rows;
    } else {
      // Both discipline_id and branch_id are null; fetch all data
      disciplines = (await db.query('SELECT * FROM discipline')).rows;
      branches = (await db.query(
        `SELECT b.*, d.name AS discipline_name 
         FROM branchnew b 
         JOIN discipline d ON b.discipline_id = d.id`
      )).rows;
      faculties = (await db.query('SELECT * FROM faculty')).rows;
    }

    // Render the page with fetched data
    res.render('faculty', { disciplines, branches, faculties });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


// Route to add a faculty
app.post('/faculty/add', async (req, res) => {
  const db = getDB();
  console.log("add faculty:");
  const { faculty_name, email, phone, discipline_id, branch_id } = req.body;
  console.log(branch_id);
  console.log(discipline_id);
  try {

    // Insert the new faculty member
    await db.query('INSERT INTO faculty (name, email, phone, branch_id, discipline_id) VALUES ($1, $2, $3, $4, $5)', [faculty_name, email, phone, branch_id,discipline_id]);
    
    res.redirect('/faculty');
  } catch (err) {
    console.error(err);
    res.send("Error " + err.message);
  }
});




// Route to delete a faculty
app.post('/faculty/delete/:id', async (req, res) => {
  const db = getDB();
  const id = req.params.id;
  try {
    await db.query('DELETE FROM faculty WHERE id = $1', [id]);
    res.redirect('/faculty');
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Route to edit a faculty
app.get('/faculty/edit/:id',checkAuthenticated, async (req, res) => {
  const db = getDB();
  const facultyId = req.params.id;
  try {
    // Fetch the faculty details
    const facultyResult = await db.query('SELECT * FROM faculty WHERE id = $1', [facultyId]);
    const faculty = facultyResult.rows[0];

    // Fetch all disciplines
    const disciplinesResult = await db.query('SELECT * FROM discipline');
    const disciplines = disciplinesResult.rows;

    // Fetch all branches
    const branchesResult = await db.query("SELECT b.*, d.name AS discipline_name FROM branchnew b JOIN discipline d ON b.discipline_id = d.id");
    const branches = branchesResult.rows;

    res.render('editFaculty', { faculty, disciplines, branches });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/faculty/upload', async (req, res) => {
  const db = getDB();

  // Check if a file was uploaded
  if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
  }

  const facultyFile = req.files.facultyFile; // Name should match the input field name in the form
  const uploadPath = path.join(__dirname, 'uploads', facultyFile.name);

  // Move the uploaded file to the server's upload folder
  facultyFile.mv(uploadPath, async (err) => {
      if (err) {
          return res.status(500).send(err);
      }

      try {
          // Read the uploaded Excel file
          const workbook = xlsx.readFile(uploadPath);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(sheet);

          // Process each row in the file
          for (const row of data) {
              const { faculty_name, email, phone, discipline_id, branch_id } = row;
              // console.log(row); 
              // Get discipline ID from discipline name
              const disciplineResult = await db.query('SELECT id FROM discipline WHERE id = $1', [discipline_id]);
              const discipline = disciplineResult.rows[0];
              console.log(discipline);
              // Get branch ID from branch name and discipline ID
              const branchResult = await db.query('SELECT branch_id FROM branchnew WHERE branch_id = $1 AND discipline_id = $2', [branch_id, discipline?.id]);
              const branch = branchResult.rows[0];
            console.log(branch);
              if (discipline && branch) {
                  // Insert faculty data into the database
                  await db.query(
                      'INSERT INTO faculty (name, email, phone, branch_id, discipline_id) VALUES ($1, $2, $3, $4, $5)',
                      [faculty_name, email, phone, branch.branch_id, discipline.id]
                  );
              } else {
                  console.error(`Discipline or Branch not found for faculty: ${faculty_name}`);
              }
          }

          // Delete the uploaded file after processing
          fs.unlinkSync(uploadPath);

          // Redirect to the faculty page after success
          res.redirect('/faculty');
      } catch (err) {
          console.error('Error processing the file:', err);
          res.status(500).send('Error processing the file: ' + err.message);
      }
  });
});



//mapping
// Fetch branches based on discipline
app.get('/api/branches/:disciplineId',checkAuthenticated, async (req, res) => {
  const db=getDB();
  const disciplineId = req.params.disciplineId;
    const branches = await db.query('SELECT branch_id, branch_name FROM branchnew WHERE discipline_id = $1', [disciplineId]);
    res.json(branches.rows);
});

// Fetch subjects based on branch
app.get('/api/subjects/:branchId',checkAuthenticated, async (req, res) => {
  const db=getDB();
  const branchId = req.params.branchId;
    const subjects = await db.query('SELECT subject_id, name FROM subjectnew WHERE branch_id = $1', [branchId]);
    res.json(subjects.rows);
});

// Fetch duration based on discipline
app.get('/api/discipline/:disciplineId/duration',checkAuthenticated, async (req, res) => {
  const db=getDB();
  const disciplineId = req.params.disciplineId;
    const discipline = await db.query('SELECT duration FROM discipline WHERE id = $1', [disciplineId]);
    res.json(discipline.rows[0]);
});

// Handling subject to semester mapping
app.post('/mapping/subjectSemester', async (req, res) => {
  const db = getDB();
  const { discipline, branch, year, semester, subject } = req.body;

  // Debug logging
  console.log('Discipline:', discipline);
  console.log('Branch:', branch);
  console.log('Year:', year);
  console.log('Semester:', semester);
  console.log('Subject:', subject);

  if (!discipline || !branch || !year || !semester || !subject) {
      console.error('One of the required fields is missing');
      return res.status(400).send('Bad Request: Missing required fields');
  }

  try {
      await db.query(
          'UPDATE subjectnew SET semester = $1 WHERE subject_id = $2 AND branch_id = $3 AND discipline_id = $4',
          [semester, subject, branch, discipline]
      );
      res.redirect('/mapping');
  } catch (error) {
      console.error('Error updating subject semester:', error);
      res.status(500).send('Server error');
  }
});


// Handling faculty to subject mapping
app.post('/mapping/facultySubject', async (req, res) => {
  const db = getDB();
    const { discipline, branch, faculty, subject, section, is_elective } = req.body;
    try {
        await db.query(
            'INSERT INTO subject_faculty (faculty_id, subject_id, section, is_elective) VALUES ($1, $2, $3, $4)',
            [faculty, subject, section, is_elective === 'true']
        );
        res.redirect('/mapping'); // Redirect to the mapping page after insertion
    } catch (error) {
        console.error('Error inserting faculty subject mapping:', error);
        res.status(500).send('An error occurred');
    }
});
// Delete subject-semester mapping
app.delete('/api/mapping/subjectSemester/:id', (req, res) => {
  const mappingId = req.params.id;
  const db = getDB();

  const query = `
      UPDATE subject_semester_mapping
      SET semester = NULL
      WHERE id = $1
      RETURNING *  
  `;

  db.query(query, [mappingId], (error, result) => {
      if (error) {
          console.error('Error executing query:', error);
          return res.status(500).json({ error: 'Failed to remove semester mapping' });
      }

      if (result.rowCount === 0) {
          console.warn(`No mapping found with ID: ${mappingId}`);
          return res.status(404).json({ error: 'Mapping not found' });
      }

      console.log(`Successfully removed semester mapping with ID: ${mappingId}`);
      res.status(200).json({ message: 'Semester mapping removed successfully', data: result.rows[0] });
  });
});

// Delete faculty-subject mapping
app.delete('/api/mapping/facultySubject/:id', async (req, res) => {
  const db = getDB();
  const mappingId = req.params.id;

  try {
      const result = await db.query('DELETE FROM subject_faculty WHERE id = $1 RETURNING *', [mappingId]);
      if (result.rowCount === 0) {
          return res.status(404).send('Mapping not found');
      }
      res.status(200).send({ success: true });
  } catch (error) {
      console.error('Error deleting faculty-subject mapping:', error);
      res.status(500).send('Server error');
  }
});



app.get('/api/faculty/:branchId',checkAuthenticated, async (req, res) => {
  const { branchId } = req.params;
  const db = getDB();

  try {
      // Query to fetch faculty members based on branch_id
      const result = await db.query(
          'SELECT id, name FROM faculty WHERE branch_id = $1',
          [branchId]
      );

      // Send the results as JSON
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching faculty:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Route to render the mapping page
app.get('/mapping',checkAuthenticated, async (req, res) => {
  try {
    const db = getDB();
      const disciplines = await getDB().query('SELECT id, name FROM discipline');
      const branches = await getDB().query('SELECT branch_id, branch_name FROM branchnew');
      const subjects = await getDB().query('SELECT subject_id, name FROM subjectnew');
      const faculties = await getDB().query('SELECT id, name FROM faculty');
      const subjectSemesterMappings = await getDB().query(`
          SELECT s.name as subjectName, sub.semester
          FROM subjectnew s
          JOIN subjectnew sub ON s.subject_id = sub.subject_id
      `);
      const facultySubjectMappings = await getDB().query(`
          SELECT f.name as facultyName, s.name as subjectName, sf.section
          FROM subject_faculty sf
          JOIN faculty f ON sf.faculty_id = f.id
          JOIN subjectnew s ON sf.subject_id = s.subject_id
      `);
      
      res.render('mapping', {
          disciplines: disciplines.rows,
          branches: branches.rows,
          subjects: subjects.rows,
          faculties: faculties.rows,
          subjectSemesterMappings: subjectSemesterMappings.rows,
          facultySubjectMappings: facultySubjectMappings.rows
      });
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
  }
});


app.post('/api/mapping/studentSubject', async (req, res) => {
  const db = getDB();

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const studentFile = req.files.studentFile;
  const uploadPath = path.join(__dirname, 'uploads', studentFile.name);

  studentFile.mv(uploadPath, async (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    try {
      const workbook = xlsx.readFile(uploadPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);

      console.log('Uploaded Data:', data);

      // Extract unique subject IDs from the file
      const subjectIds = new Set();
      data.forEach(item => {
        subjectIds.add(item['Subject 1']);
        subjectIds.add(item['Subject 2']);
        subjectIds.add(item['Subject 3']);
        subjectIds.add(item['Subject 4']);
        subjectIds.add(item['Subject 5']);
      });

      // Remove any undefined/null values
      const validSubjectIds = Array.from(subjectIds).filter(id => id);
      // console.log(validSubjectIds);

      // Fetch subject names from subjectnew table
      const subjectsMap = {};
      if (validSubjectIds.length > 0) {
        const query = `SELECT subject_id, name FROM subjectnew WHERE subject_id = ANY($1)`;
        const { rows } = await db.query(query, [validSubjectIds]);
        // console.log(rows);
        rows.forEach(row => {
          subjectsMap[row.subject_id] = row.name;
        });
      }
      // console.log(subjectsMap);

      // Prepare data for insertion
      const studentSubjectData = data.map(item => ({
        unique_id: item.unique_id,
        name: item.Name,
        branch_name: item['Branch Name'],
        year: item.Year,
        section: item.Section,
        discipline_id: item['Discipline ID'],
        semester: item.Semester,
        subject_1: subjectsMap[item['Subject 1']] || null,
        subject_2: subjectsMap[item['Subject 2']] || null,
        subject_3: subjectsMap[item['Subject 3']] || null,
        subject_4: subjectsMap[item['Subject 4']] || null,
        subject_5: subjectsMap[item['Subject 5']] || null
      }));

      // Insert data into the database
      const query = `
        INSERT INTO student_subject 
        (unique_id, name, branch_name, year, section, discipline_id, semester, subject_1, subject_2, subject_3, subject_4, subject_5)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      for (const item of studentSubjectData) {
        const values = [
          item.unique_id,
          item.name,
          item.branch_name,
          item.year,
          item.section,
          item.discipline_id,
          item.semester,
          item.subject_1,
          item.subject_2,
          item.subject_3,
          item.subject_4,
          item.subject_5
        ];

        await db.query(query, values);
      }

      fs.unlinkSync(uploadPath);
      res.status(200).send('Student-subject data uploaded successfully.');
    } catch (err) {
      console.error('Error processing the file:', err);
      res.status(500).send('Error processing the file: ' + err.message);
    }
  });
});


// Route to fetch the student-subject mappings for the table
app.get('/api/mapping/studentSubject',checkAuthenticated, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM student_subject');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching data from database:', error);
    res.status(500).send('Server error while fetching mappings');
  }
});

app.delete('/api/mapping/studentSubject/:id', async (req, res) => {
  const mappingId = req.params.id;

  try {
    const result = await db.query('DELETE FROM student_subject WHERE id = $1 RETURNING *', [mappingId]);
    if (result.rowCount === 0) {
      return res.status(404).send('Mapping not found');
    }
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error deleting student-subject mapping:', error);
    res.status(500).send('Server error');
  }
});



//server


app.get('/server',checkAuthenticated, async (req, res) => {

  const db = getDB();
  try {
      // Query to get the is_Allowed status for each semester
      const result = await db.query(`
          SELECT semester, bool_or(is_allowed) AS is_allowed
          FROM users
          GROUP BY semester
          ORDER BY semester;
      `);

      // Create an array of states for the semesters (1 to 8)
      const semesterStates = new Array(8).fill(false);
      result.rows.forEach(row => {
          if (row.semester >= 0 && row.semester <= 8) {
              semesterStates[row.semester - 1] = row.is_allowed;
          }
      });

      res.render('server', { semesterStates });
  } catch (error) {
      console.error('Error fetching semester states:', error);
      res.status(500).send('Internal Server Error');
  }
});

// Route to handle the toggle action
app.post('/server/toggle', async (req, res) => {

  const db = getDB();
  const semester = parseInt(req.body.semester);

  try {
      // Get the current state of the selected semester
      const currentStateResult = await db.query(`
          SELECT bool_or(is_allowed) AS is_allowed
          FROM users
          WHERE semester = $1;
      `, [semester]);

      const currentState = currentStateResult.rows[0].is_allowed;

      // Toggle the state
      const newState = !currentState;

      // Update the users table
      await db.query(`
          UPDATE users
          SET is_allowed = $1
          WHERE semester = $2;
      `, [newState, semester]);

      res.redirect('/server');
  } catch (error) {
      console.error('Error updating server state:', error);
      res.status(500).send('Internal Server Error');
  }
});






//report
app.get('/report', checkAuthenticated, async (req, res) => {
  const db = getDB();
  const currentYear = new Date().getFullYear();
  const userDiscipline = req.session.adminDetails?.discipline || null;
  const userBranch = req.session.adminDetails?.branch_name || null;
  
  let branchId = null;
  if (userBranch) {
    const branchResult = await db.query(
      'SELECT branch_id FROM branchnew WHERE branch_name = $1',
      [userBranch]
    );
    branchId = branchResult.rows.length ? branchResult.rows[0].branch_id : null;
  }

  try {
    const facultyId = req.query.facultyId || '';
    const feedbackYear = req.query.feedbackYear || currentYear;
    const semesterType = req.query.semesterType || ''; // Capture semester type from query

    // Fetch all faculties for the dropdown
    let facultiesQuery = 'SELECT id, name FROM faculty';
    const queryParams1 = [];
    if (branchId) {
      facultiesQuery += ' WHERE branch_id = $1';
      queryParams1.push(branchId);
    }
    const facultiesResult = await db.query(facultiesQuery, queryParams1);
    const faculties = facultiesResult.rows;

    // Construct the feedback query
    let feedbackQuery = `
      SELECT 
          f.year, 
          f.section, 
          f.branch, 
          f.subject,
          f.semester,
          f.feedback_year,
          fac.name AS faculty_name, 
          SUM(f.q1) AS q1, 
          SUM(f.q2) AS q2, 
          SUM(f.q3) AS q3, 
          SUM(f.q4) AS q4, 
          SUM(f.q5) AS q5, 
          SUM(f.q6) AS q6, 
          SUM(f.q7) AS q7, 
          SUM(f.q8) AS q8, 
          SUM(f.q9) AS q9, 
          SUM(f.q10) AS q10, 
          SUM(f.responses) AS responses 
      FROM feedback f
      JOIN faculty fac ON f.fac_id = fac.id
    `;

    const queryParams = [];
    let whereClauses = [];

    if (userDiscipline) {
      queryParams.push(userDiscipline);
      whereClauses.push(`f.discipline_id = $${queryParams.length}`);
    }

    if (branchId) {
      queryParams.push(branchId);
      whereClauses.push(`f.branch_id = $${queryParams.length}`);
    }

    if (facultyId) {
      queryParams.push(facultyId);
      whereClauses.push(`f.fac_id = $${queryParams.length}`);
    }

    if (feedbackYear) {
      queryParams.push(feedbackYear);
      whereClauses.push(`f.feedback_year = $${queryParams.length}`);
    }

    // Filter based on semester type
    if (semesterType === 'Odd') {
      whereClauses.push(`(f.semester % 2) = 1`); // Odd semesters (1, 3, 5, 7)
    } else if (semesterType === 'Even') {
      whereClauses.push(`(f.semester % 2) = 0`); // Even semesters (2, 4, 6, 8)
    }

    // Combine where clauses
    if (whereClauses.length > 0) {
      feedbackQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    feedbackQuery += ` GROUP BY f.year, f.section, f.branch, f.subject, f.semester, f.feedback_year, fac.name 
                       ORDER BY f.year, f.section`;

    console.log(feedbackQuery); // Debugging

    const feedbackResult = await db.query(feedbackQuery, queryParams);
    const feedbacks = feedbackResult.rows;

    // Render the report page
    res.render('report', { faculties, facultyId, feedbackYear, semesterType, feedbacks });
  } catch (err) {
    console.error('Error fetching report data:', err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/report/download', checkAuthenticated, async (req, res) => {
  const db = getDB();
  const currentYear = new Date().getFullYear();
  const userDiscipline = req.session?.adminDetails?.discipline || null;
  const userBranch = req.session?.adminDetails?.branch_name || null;
  let branchId = null;
  if (userBranch) {
      const branchResult = await db.query(
          'SELECT branch_id FROM branchnew WHERE branch_name = $1',
          [userBranch]
      );
      branchId = branchResult.rows.length ? branchResult.rows[0].branch_id : null;
  }
  try {
      const feedbackYear = req.query.feedbackYear || currentYear;
      const facultyName = req.query.facultyName || '';
      let feedbackQuery = `
          SELECT 
              f.year, 
              f.section, 
              f.branch, 
              f.subject,
              ROUND((SUM(f.q1) + SUM(f.q2) + SUM(f.q3) + SUM(f.q4) + SUM(f.q5) +
                     SUM(f.q6) + SUM(f.q7) + SUM(f.q8) + SUM(f.q9) + SUM(f.q10)) / (SUM(f.responses) * 10), 2) 
                     AS average_score
          FROM feedback f
          JOIN faculty fac ON f.fac_id = fac.id
          WHERE f.feedback_year = $1
      `;
      const queryParams = [feedbackYear];
      if (userDiscipline) {
          feedbackQuery += ` AND f.discipline_id = $${queryParams.length + 1}`;
          queryParams.push(userDiscipline);
      }
      if (branchId) {
          feedbackQuery += ` AND f.branch_id = $${queryParams.length + 1}`;
          queryParams.push(branchId);
      }
      if (facultyName) {
          feedbackQuery += ` AND fac.name = $${queryParams.length + 1}`;
          queryParams.push(facultyName);
      }
      feedbackQuery += ` GROUP BY f.year, f.section, f.branch, f.subject ORDER BY f.year, f.section`;
      const feedbackResult = await db.query(feedbackQuery, queryParams);
      const feedbacks = feedbackResult.rows;
      if (!feedbacks.length) {
          return res.status(404).send("No feedback data available.");
      }
      const fontsPath = path.join(__dirname, "public/assets/fonts");
      if (!fs.existsSync(fontsPath)) {
          return res.status(500).send("Fonts directory not found. Please add required fonts.");
      }
      const fonts = {
          Roboto: {
              normal: path.join(fontsPath, "roboto-regular-webfont.woff"),
              bold: path.join(fontsPath, "roboto-bold-webfont.ttf"),
              italics: path.join(fontsPath, "robotocondensed-regular-webfont.ttf"),
              bolditalics: path.join(fontsPath, "roboto-bold-webfont.ttf"),
          }
      };
      const printer = new PdfPrinter(fonts);
      const tableHeaders = ["Year", "Section", "Branch", "Subject", "Average Score"];
      const tableBody = [
          tableHeaders.map(header => ({ text: header, bold: true }))
      ];
      feedbacks.forEach(row => {
          tableBody.push([
              row.year,
              row.section,
              row.branch,
              row.subject,
              (Number(row.average_score) || 0).toFixed(2),
          ]);
      });
      const aggregatedFeedbacks = {};
      feedbacks.forEach(row => {
          const key = `${row.year}-${row.branch}-${row.subject}`;
          if (!aggregatedFeedbacks[key]) {
              aggregatedFeedbacks[key] = { 
                  year: row.year,
                  branch: row.branch,
                  subject: row.subject,
                  totalScore: 0, 
                  count: 0 
              };
          }
          aggregatedFeedbacks[key].totalScore += Number(row.average_score);
          aggregatedFeedbacks[key].count += 1;
      });
      const aggregatedTableHeaders = ["Year", "Branch", "Subject", "Average Score"];
      const aggregatedTableBody = [
          aggregatedTableHeaders.map(header => ({ text: header, bold: true }))
      ];
      Object.values(aggregatedFeedbacks).forEach(row => {
          aggregatedTableBody.push([
              row.year,
              row.branch,
              row.subject,
              (row.totalScore / row.count).toFixed(2),
          ]);
      });
      const headerImagePath = path.join(__dirname, "public/assets/images/header.png");
      const footerImagePath = path.join(__dirname, "public/assets/images/footer.png");
      const docDefinition = {
        pageSize: "A4",
    pageMargins: [40, 100, 40, 80], // Adjust margins to fit header and footer

    header: {
      stack: [
        {
            image: path.join(__dirname, 'public/assets/images/header.png'),
            width: 500,
            alignment: 'center'
        },
        {
            canvas: [ // Horizontal line
                { type: 'line', x1: 0, y1: 5, x2: 595, y2: 5, lineWidth: 10 , color:'black'}
            ]
        }
    ],
    margin: [0, 10, 0, 10]
    },
    
    footer: (currentPage, pageCount) => ({
        columns: [
            { image: footerImagePath, width: 500, alignment: "center" },
        ],
        margin: [40, 0, 40, 100]
    }),
          content: [
              { text: "Faculty Feedback Report", style: "header" },
              { text: `Feedback Year: ${feedbackYear}`, margin: [0, 10, 0, 10] },
              facultyName ? { text: `Faculty: ${facultyName}`, margin: [0, 0, 0, 10] } : {},
              {
                  table: {
                      headerRows: 1,
                      widths: ["*", "*", "*", "*", "*"],
                      body: tableBody,
                  },
                  layout: "lightHorizontalLines",
                  margin: [0, 20, 0, 20]
              },
              { text: "Aggregated Feedback Report", style: "header", margin: [0, 20, 0, 10] },
              {
                  table: {
                      headerRows: 1,
                      widths: ["*", "*", "*", "*"],
                      body: aggregatedTableBody,
                  },
                  layout: "lightHorizontalLines",
              }
          ],
          styles: {
              header: { fontSize: 18, bold: true, alignment: "center", margin: [0, 10, 0, 10] }
          }
      };
      const filePath = path.join(__dirname, `faculty_feedback_report_${Date.now()}.pdf`);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const writeStream = fs.createWriteStream(filePath);
      pdfDoc.pipe(writeStream);
      pdfDoc.end();
      writeStream.on("finish", () => {
          res.download(filePath, "faculty_feedback_report.pdf", (err) => {
              if (err) {
                  console.error("Error sending file:", err);
              }
              fs.unlink(filePath, (err) => {
                  if (err) console.error("Error deleting file:", err);
              });
          });
      });
  } catch (err) {
      console.error("Error generating PDF:", err);
      res.status(500).send("Error generating PDF");
  }
});

app.get('/faculty-feedback', checkAuthenticated, async (req, res) => {
  const db = getDB();
  try {
      // Fetch all disciplines
      const disciplines = await db.query('SELECT * FROM discipline');
      // Fetch all faculty members
      const faculty = await db.query('SELECT * FROM faculty');
      res.render('faculty-feedback', {
          disciplines: disciplines.rows,
          faculty: faculty.rows
      });
  } catch (err) {
      console.error(err);
      res.send("Error fetching faculty feedback data: " + err);
  }
});
// Fetch faculty based on discipline selection
app.get('/get-faculty', async (req, res) => {
  const db = getDB();
  const { discipline } = req.query;
  try {
      const faculty = await db.query('SELECT * FROM faculty WHERE discipline_id = $1', [discipline]);
      res.json(faculty.rows);
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching faculty data");
  }
});
// Fetch subjects dynamically based on selected faculty
app.get('/get-subjects', async (req, res) => {
  const db = getDB();
  const { faculty } = req.query;
  try {
      const subjects = await db.query(`
          SELECT s.subject_id, s.name AS subject_name 
          FROM subjectnew s 
          JOIN subject_faculty sf ON s.subject_id = sf.subject_id 
          WHERE sf.faculty_id = $1
      `, [faculty]);
      res.json(subjects.rows);
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching subjects data");
  }
});


//teacher remarks
app.get('/teacher-remarks', checkAuthenticated, async (req, res) => {
  const db = getDB();
  const currentYear = new Date().getFullYear();
  const userDiscipline = req.session.adminDetails?.discipline || null;
  const userBranch = req.session.adminDetails?.branch_name || null;

  let branchId = null;
  if (userBranch) {
    const branchResult = await db.query(
      'SELECT branch_id FROM branchnew WHERE branch_name = $1',
      [userBranch]
    );
    branchId = branchResult.rows.length ? branchResult.rows[0].branch_id : null;
  }

  try {
    const facultyId = req.query.facultyId || '';
    const feedbackYear = req.query.feedbackYear || currentYear;
    const semesterType = req.query.semesterType || ''; // Capture semester type from query

    // Fetch all faculties for the dropdown
    let facultiesQuery = 'SELECT id, name FROM faculty';
    const queryParams1 = [];
    if (branchId) {
      facultiesQuery += ' WHERE branch_id = $1';
      queryParams1.push(branchId);
    }
    const facultiesResult = await db.query(facultiesQuery, queryParams1);
    const faculties = facultiesResult.rows;

    // Construct the query to fetch remarks data
    let feedbackQuery = `
      SELECT 
          f.year, 
          f.section, 
          f.branch, 
          f.semester,
          f.feedback_year,
          fac.name AS faculty_name, 
          f.response 
      FROM responses f
      JOIN faculty fac ON f.fac_id = fac.id
    `;

    const queryParams = [];
    let whereClauses = [];

    if (userDiscipline) {
      queryParams.push(userDiscipline);
      whereClauses.push(`f.discipline_id = $${queryParams.length}`);
    }

    if (branchId) {
      queryParams.push(branchId);
      whereClauses.push(`f.branch_id = $${queryParams.length}`);
    }

    if (facultyId) {
      queryParams.push(facultyId);
      whereClauses.push(`f.fac_id = $${queryParams.length}`);
    }

    if (feedbackYear) {
      queryParams.push(feedbackYear);
      whereClauses.push(`f.feedback_year = $${queryParams.length}`);
    }

    // Apply semester type filtering
    if (semesterType === 'Odd') {
      whereClauses.push(`(f.semester % 2) = 1`); // Odd semesters (1, 3, 5, 7)
    } else if (semesterType === 'Even') {
      whereClauses.push(`(f.semester % 2) = 0`); // Even semesters (2, 4, 6, 8)
    }

    // Combine all where clauses
    if (whereClauses.length > 0) {
      feedbackQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    feedbackQuery += ` ORDER BY f.year, f.section`;

    console.log(feedbackQuery); // Debugging

    const feedbackResult = await db.query(feedbackQuery, queryParams);
    const feedbacks = feedbackResult.rows;

    // Render the teacher-remarks page
    res.render('teacher-remarks', { faculties, facultyId, feedbackYear, semesterType, feedbacks });
  } catch (err) {
    console.error('Error fetching remarks data:', err);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/summarize-feedback', checkAuthenticated, async (req, res) => {
  const db = getDB();
  const { facultyId, feedbackYear, semesterType } = req.body;

  try {
    // Construct the query based on semesterType
    let feedbackQuery = `
      SELECT response 
      FROM responses 
      WHERE fac_id = $1 AND feedback_year = $2
    `;

    if (semesterType === 'Odd') {
      feedbackQuery += ' AND MOD(semester, 2) = 1';
    } else if (semesterType === 'Even') {
      feedbackQuery += ' AND MOD(semester, 2) = 0';
    }

    // Execute the query
    const { rows: feedbackResult } = await db.query(feedbackQuery, [facultyId, feedbackYear]);
    const feedbackResponses = feedbackResult.map(row => row.response).join('\n');

    // If no feedback is found, return an error
    if (!feedbackResponses) {
      return res.status(404).json({ error: 'No feedback found for the selected faculty.' });
    }

    // Use DeepSeek to summarize the feedback
    const summarizedFeedback = await aiServices.summarizeFeedback(feedbackResponses);

    // Return the summarized feedback and suggestions
    res.json({ summary: summarizedFeedback });
  } catch (err) {
    console.error('Error summarizing feedback:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




// app.use((req, res, next) => {
//   // Disable caching for logged-out users
//   if (!req.isAuthenticated()) {
//     res.set('Cache-Control', 'no-store');
//   }
//   next();
// });




//report end


app.get('/dashboard',checkAuthenticated, (req, res) => {
  const facultyScores = {};
  faculties.forEach(faculty => {
      const feedbackData = feedback.filter(item => item.facultyId === faculty.UniqueID);
      if (feedbackData.length > 0) {
          const totalScore = feedbackData.reduce((acc, curr) => acc + curr.scores.reduce((a, c) => a + c, 0), 0);
          const averageScore = totalScore / (feedbackData.length * 10);
          facultyScores[faculty.name] = averageScore.toFixed(2);
      } else {
          facultyScores[faculty.name] = 0;
      }
  });

  res.render('dashboard', { facultyScores });
});


// Logout route
// Disable caching for authenticated pages
app.use(function (req, res, next) {
  res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

function checkNotAuthenticated(req,res,next){
  if(req.isAuthenticated()){
    if(req.user.role=='admin'){
      console.log(req.user.role);
      return res.render('admin')
    }
    
  }
  next()
}
function checkAuthenticated(req,res,next){
  if(req.isAuthenticated()){
    return next()
  }
  res.render('login',{message: 'Welcome to login page'})
}
app.delete("/logout", (req, res, next) => {
  if(req.isAuthenticated()){
    req.logout((err) => {
      if (err) {
        return next(err); // Handle errors from req.logout()
      }
    
      
      // Destroy session and clear cookies
      req.session.destroy((err) => {
        if (err) {
          console.log('Error destroying session:', err);
          return next(err);
        }

        // Clear the session cookie
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        });

        // Prevent caching of the previous session page
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // Render login page with a message
        res.render('login', {
          message: 'Logged Out Successfully.' // Pass the message to the login page
        });
      
      });

    });
  }else{
    res.redirect("/");
  }
});




app.use((req, res) => {
  res.status(404).send("API not found.");
});

// passport.serializeUser((user, cb) => {
//   cb(null, user);
// });
// passport.deserializeUser((user, cb) => {
//   cb(null, user);
// });
app.get("*",(req,res)=>{
  res.redirect("/");
})

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
  connectToDB();
});