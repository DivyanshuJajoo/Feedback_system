import express from "express";
import dotenv from "dotenv";
import swagger from "swagger-ui-express";
import userRoute from "./src/features/user/user.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import pg from "pg"
import bcrypt from "bcrypt"

dotenv.config();
import apiDocs from "./swagger_ver3.0.json" assert { type: "json" };
import { ApplicationError } from "./src/errorHandle/error.js";
import { connectToMongoDB } from "./src/config/mongodb.js";
import loggerMiddleware from "./src/middleware/logger.middleware.js";
import jwtAuthProf from "./src/middleware/jwt.middleware.js";
const app = express();
const saltRounds=10;
app.set('view engine', 'ejs');
app.use(express.static("public"));

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


const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'Feedback',
  password: 'Jajoo@2001',
  port: 5432,
});

db.connect((err, Client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL database');
});

app.get("/", async(req, res) => {
  res.render('login.ejs')
});
app.get("/login", async(req, res) => {
  res.render('login.ejs')
});
app.get("/signup", async(req, res) => {
  res.render('signup')
});

//  var subjects = [
//   { id: 1, name: 'A' },
//   { id: 2, name: 'B' },
//   { id: 3, name: 'C' }
// ];

let subjects=[];
let faculties=[];
async function fetchSubjects(branchName, yearValue) {
  const sqlQuery = {
    text: 'SELECT subjects FROM Branch_sub WHERE branch_name = $1 AND year = $2',
    values: [branchName, parseInt(yearValue)]
  };
  

  try {
    const res = await db.query(sqlQuery);
    return res.rows.map(row => row.subjects);
  } catch (err) {
    console.error('Error executing query:', err);
    return [];
  }
}
async function fetchfaculties(subjects) {
  // console.log(subject);
  // const facultyQuery = {
  //   text: 'SELECT faculty_name FROM subject WHERE subject_name = $1',
  //   values: [subject]
  // };
  
    for (const subject of subjects) {
      const facultyQuery = {
        text: 'SELECT faculty_name FROM Subject WHERE subject_name = $1',
        values: [subject]
      };
      try{
      const facultyRes = await db.query(facultyQuery);
      const facultiesForSubject = facultyRes.rows.map(row => row.faculty_name);
      console.log(facultiesForSubject);
      for(const fac of facultiesForSubject)faculties.push(fac);
      // faculties[subject] = facultiesForSubject;
      
    }
    catch (err) {
      console.error('Error fetching subjects and faculties:', err);
    }
  } 
  return faculties;
  return [];
}


//  var faculties = [
//   { UniqueID: 1, name: 'a' },
//   { UniqueID: 2, name: 'b' },
//   { UniqueID: 3, name: 'c' }
// ];
// const users = [
//   { UniqueID: 1, name: 'a',role:"Student",admin:0,has_filled:0,password:1 },
//   { UniqueID: 2, name: 'b' ,role:"Student",admin:0,has_filled:0,password:2 },
//   { UniqueID: 3, name: 'c' ,role:"Student",admin:0,has_filled:0,password:3 }  
// ];

const feedback = [
  { facultyId: 1, subjectId: 1, scores: [5, 7, 8, 9, 6, 7, 8, 9, 10, 8], remark: 'Good' },
  { facultyId: 1, subjectId: 2, scores: [8, 9, 7, 6, 8, 7, 6, 5, 8, 9], remark: 'Average' },
  { facultyId: 2, subjectId: 1, scores: [9, 9, 8, 7, 9, 10, 8, 7, 9, 9], remark: 'Excellent' },
  { facultyId: 2, subjectId: 2, scores: [7, 8, 9, 8, 7, 6, 8, 7, 8, 9], remark: 'Good' },
];


// async function authenticateUser(uniqueid, password) {
//   try {

//     const query1 = 'SELECT * FROM users ORDER BY uniqueid LIMIT 1'; 
//     const result1 = await db.query(query1);
//     const firstUser = result1.rows[0];
//     console.log('First user:', firstUser);

//     const query = 'SELECT * FROM users WHERE "uniqueid" = $1';
//     const result = await db.query(query, [uniqueid]);

//     console.log('User data from database:', result.rows);

//     if (result.rows.length === 0) {
//       return { success: false, message: 'Invalid credentials' };
//     }

//     const user = result.rows[0];

//     console.log('User retrieved:', user);
//     const isPasswordMatch = await bcrypt.compare(password, user.password);

//     console.log('Password match:', isPasswordMatch);

//     if (isPasswordMatch) {
//       return { success: true, user: user };
//     } else {
//       return { success: false, message: 'Invalid credentials' };
//     }
//   } catch (error) {
//     console.error('Error authenticating user:', error);
//     return { success: false, message: 'An error occurred while authenticating' };
//   }
// }

app.get('/feedback', async(req, res) => {
  res.render('feedback', { subjects, faculties });
});


app.post("/signup", async(req, res) => { 
  const email=req.body;
  console.log(email);

  res.render('login')
});

app.post("/login", async(req, res) => {

  const uniqueid=req.body.uniqueid
  const password=req.body.password;
  const body=req.body

  // console.log(body)
  // console.log(uniqueid)
  // console.log(password)

  try{
    // const query1 = 'SELECT * FROM users ORDER BY uniqueid LIMIT 1'; 
    // const result1 = await db.query(query1);
    // const firstUser = result1.rows[0];
    // console.log('First user:', firstUser);
    const result= await db.query("SELECT * FROM users WHERE uniqueid=$1",[uniqueid,]);
    console.log('User data from database:', result.rows);
    if(result.rowCount>0){
      const user=result.rows[0];
      const storedpassword=user.password;

      // console.log(password);
      // console.log(storedpassword);

      if(password===storedpassword){
        const role=user.role;
        if (role === 'Student') {
          const branch_name=user.branch;
          const year=user.year;
          const subjects = await fetchSubjects(branch_name, year);
          const faculties = await fetchfaculties(subjects);
          console.log('Subjects outside:', subjects);
          console.log('faculties:',faculties);
          res.render('feedback',{subjects, faculties});
      } else {
          res.render('dashboard');
      }
      }
      else {
        res.send("INCORRECT LOGIN CREDENTIALS");
      }
    }
    else{
      res.send("USER NOT FOUND");
    }
    
  }
  catch(err){
    console.log(err);
  }
  // try {
  //   const { uniqueid, password } = req.body;
  //   const authResult = await authenticateUser(uniqueid, password);

  //   if (authResult.success) {
  //     // return res.render('feedback',{ subjects, faculties }, { user: authResult.user });
  //     if (req.user.role === 'Student') {
  //           return res.redirect('feedback',{subjects, faculties}, { user: authResult.user });
  //       } else {
  //           return res.redirect('dashboard');
  //       }
  //   } else {
  //     return res.status(401).send('Invalid credentials');
  //   }
  // } catch (error) {
  //   console.error('Error during login:', error);
  //   return res.status(500).send('Internal server error');
  // }
  
  // res.render('feedback',{ subjects, faculties })
//   if (req.user.role === 'Student') {
//     return res.redirect('feedback',{subjects, faculties});
// } else {
//     return res.redirect('dashboard');
// }
});


app.post('/feedback',(req, res) => {
  const { subject, faculty } = req.body;

    subjects = subjects.filter(s => s.name !== subject);
    faculties = faculties.filter(f => f.name !== faculty);
    if (!faculties || faculties.length === 0) {
      res.send("Success");
      return res.redirect('/login');
  }

    res.redirect('/feedback');
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

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
  connectToMongoDB();
});
