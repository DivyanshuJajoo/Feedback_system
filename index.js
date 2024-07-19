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

app.get("/", async(req, res) => {
  res.render('login.ejs')
});
app.get("/login", async(req, res) => {
  res.render('login.ejs')
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






app.post('/submit-feedback', async (req, res) => {
  const db=getDB();
 const user=req.user;
 const uniqueid=user.uniqueid;
 const year=user.year;
 const section=user.section;
 const branch=user.branch_name;
 const faculties = JSON.parse(req.body.faculties);
 const obj = JSON.parse(JSON.stringify(req.body)); 
 req.body=obj;
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

 try{
 for (let i = 0; i <faculties.length; i++) {
  // console.log('inside');
  // const facultyId = req.faculties[i].Assigned_faculty.id;
  const facultyFeedback = {};
  for (let j = 1; j <= 10; j++) {
    facultyFeedback[j] = req.body[`selectedPoint${i}-${j}`];
}
  const feedbackData = {
    fac_id: faculties[i].Assigned_faculty.id,
    subject:faculties[i].subject,
    year: year,
    branch: branch,
    section: section,
    Q1: facultyFeedback[1], // Assuming ratingResponses is an array of objects containing ratings for each question
    Q2: facultyFeedback[2],
    Q3: facultyFeedback[3],
    Q4: facultyFeedback[4],
    Q5: facultyFeedback[5],
    Q6: facultyFeedback[6],
    Q7: facultyFeedback[7],
    Q8: facultyFeedback[8],
    Q9: facultyFeedback[9],
    Q10: facultyFeedback[10],
    responses:1,
  };

  const existingFeedback = await db.query({
    text: `
        SELECT * FROM feedback
        WHERE fac_id = $1 AND subject = $2 AND year = $3 AND branch = $4 AND section = $5
    `,
    values: [feedbackData.fac_id, feedbackData.subject, feedbackData.year, feedbackData.branch, feedbackData.section]
});

if (existingFeedback.rows.length > 0) {
  // Update existing entry
  const updateQuery = {
      text: `
          UPDATE feedback
          SET q1 = q1 + $6, q2 = q2 + $7, q3 = q3 + $8, q4 = q4 + $9, q5 = q5 + $10,
              q6 = q6 + $11, q7 = q7 + $12, q8 = q8 + $13, q9 = q9 + $14, q10 = q10 + $15,
              responses = responses + 1
          WHERE fac_id = $1 AND subject = $2 AND year = $3 AND branch = $4 AND section = $5
      `,
      values: [
          feedbackData.fac_id, feedbackData.subject, feedbackData.year, feedbackData.branch, feedbackData.section,
          feedbackData.Q1, feedbackData.Q2, feedbackData.Q3, feedbackData.Q4, feedbackData.Q5,
          feedbackData.Q6, feedbackData.Q7, feedbackData.Q8, feedbackData.Q9, feedbackData.Q10
      ]
  };
  await db.query(updateQuery);
} else {

  const feedbackQuery = {
    text: `
      INSERT INTO feedback (fac_id, subject,year,branch,section,q1, q2, q3, q4, q5, q6, q7, q8, q9, q10,responses)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15,$16 )
    `,
    values: [
      feedbackData.fac_id,
      feedbackData.subject,
      feedbackData.year,
      feedbackData.branch,
      feedbackData.section,
      feedbackData.Q1,
      feedbackData.Q2,
      feedbackData.Q3,
      feedbackData.Q4,
      feedbackData.Q5,
      feedbackData.Q6,
      feedbackData.Q7,
      feedbackData.Q8,
      feedbackData.Q9,
      feedbackData.Q10,
      feedbackData.responses
    ]
  };
  await db.query(feedbackQuery);
}
 }

res.status(200).send('Feedback submitted successfully.');
}
 catch (error) {
console.error('Error while submitting feedback:', error);
res.status(500).send('Internal Server Error');
} 
 
});








app.get('/collegeDetails', (req, res) => {
  res.render('collegeDetails.ejs'); 
});
app.get('/admin', (req, res) => {
  res.render('admin.ejs'); 
});



app.get('/accessing', (req, res) => {
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
  res.render('login');

// }

  // console.log(email);

  // res.render('login')
});


//subjects

app.get('/subjects', async (req, res) => {
  const db = getDB();
  try {
    const disciplinesResult = await db.query('SELECT * FROM discipline');
    const branchesResult = await db.query("SELECT * FROM branchnew");
    const subjectsResult = await db.query(`
       SELECT s.subject_id, s.name, d.name AS discipline_name, b.branch_name
      FROM subjectnew s
      JOIN branchnew b ON s.branch_id = b.branch_id
      JOIN discipline d ON b.discipline_id = d.id
    `);
    res.render('subjects', {
      disciplines: disciplinesResult.rows,
      branches: branchesResult.rows,
      subjects: subjectsResult.rows,
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


app.get('/subjects/edit/:id', async (req, res) => {
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




//discipline
app.get('/discipline', async (req, res) => {
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

app.get('/discipline/edit/:id', async (req, res) => {
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



app.get('/branches', async (req, res) => {
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
app.get('/faculty', async (req, res) => {
  const db = getDB();
  try {

    
    
    // Fetch all disciplines
    const disciplinesResult = await db.query('SELECT * FROM discipline');
    const disciplines = disciplinesResult.rows;

    // Fetch all branches
    const branchesResult = await db.query("SELECT b.*, d.name AS discipline_name FROM branchnew b JOIN discipline d ON b.discipline_id = d.id");
    const branches = branchesResult.rows;

    // Fetch all faculties
    const facultiesResult = await db.query('SELECT * FROM faculty');
    const faculties = facultiesResult.rows;

    res.render('faculty', { disciplines, branches, faculties });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

// Route to add a faculty
app.post('/faculty/add', async (req, res) => {
  const db = getDB();
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
app.get('/faculty/edit/:id', async (req, res) => {
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
    const branchesResult = await db.query('SELECT * FROM branch_sub');
    const branches = branchesResult.rows;

    res.render('faculty_edit', { faculty, disciplines, branches });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});



//mapping
// Fetch branches based on discipline
app.get('/api/branches/:disciplineId', async (req, res) => {
  const db=getDB();
  const disciplineId = req.params.disciplineId;
    const branches = await db.query('SELECT branch_id, branch_name FROM branchnew WHERE discipline_id = $1', [disciplineId]);
    res.json(branches.rows);
});

// Fetch subjects based on branch
app.get('/api/subjects/:branchId', async (req, res) => {
  const db=getDB();
  const branchId = req.params.branchId;
    const subjects = await db.query('SELECT subject_id, name FROM subjectnew WHERE branch_id = $1', [branchId]);
    res.json(subjects.rows);
});

// Fetch duration based on discipline
app.get('/api/discipline/:disciplineId/duration', async (req, res) => {
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
  const db=getDB();
  const { discipline, branch, year, semester, faculty, subject, section } = req.body;
    await db.query('INSERT INTO subject_faculty (faculty_id, subject_id, section) VALUES ($1, $2, $3)', [faculty, subject, section]);
    res.redirect('/mapping'); // Redirect to mapping page after insertion
});



app.get('/api/faculty/:branchId', async (req, res) => {
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
app.get('/mapping', async (req, res) => {
  try {
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
          SELECT f.name as facultyName, s.name as subjectName
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

//server

let serverState = 'OFF';
// Route to display the server control page
app.get('/server', (req, res) => {
  
  res.render('server', { serverState });
});

// Route to toggle the server state
app.post('/server/toggle', (req, res) => {
  serverState = req.body.serverState;
  res.redirect('/server');
});

// Middleware to check if the server is on for student routes
app.use((req, res, next) => {
  if (req.path.startsWith('/feedback') && serverState === 'OFF') {
    return res.send('The feedback form is currently unavailable.');
  }
  next();
});



app.get('/dashboard', (req, res) => {
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


app.use((req, res) => {
  res.status(404).send("API not found.");
});

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
  connectToDB();
});
