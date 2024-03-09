import express from "express";
import dotenv from "dotenv";
import swagger from "swagger-ui-express";
import userRoute from "./src/features/user/user.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

dotenv.config();
import apiDocs from "./swagger_ver3.0.json" assert { type: "json" };
import { ApplicationError } from "./src/errorHandle/error.js";
import { connectToMongoDB } from "./src/config/mongodb.js";
import loggerMiddleware from "./src/middleware/logger.middleware.js";
import jwtAuthProf from "./src/middleware/jwt.middleware.js";
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(bodyParser.json({ type: "application/*+json" }));
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


app.get("/", (req, res) => {
  res.render('Login')
});
app.get("/login", (req, res) => {
  res.render('Login')
});
app.get("/signup", (req, res) => {
  res.render('signup')
});

 var subjects = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
];

 var faculties = [
  { UniqueID: 1, name: 'a' },
  { UniqueID: 2, name: 'b' },
  { UniqueID: 3, name: 'c' }
];
const users = [
  { UniqueID: 1, name: 'a',role:"Student",admin:0,has_filled:0,password:1 },
  { UniqueID: 2, name: 'b' ,role:"Student",admin:0,has_filled:0,password:2 },
  { UniqueID: 3, name: 'c' ,role:"Student",admin:0,has_filled:0,password:3 }  
];

const feedback = [
  { facultyId: 1, subjectId: 1, scores: [5, 7, 8, 9, 6, 7, 8, 9, 10, 8], remark: 'Good' },
  { facultyId: 1, subjectId: 2, scores: [8, 9, 7, 6, 8, 7, 6, 5, 8, 9], remark: 'Average' },
  { facultyId: 2, subjectId: 1, scores: [9, 9, 8, 7, 9, 10, 8, 7, 9, 9], remark: 'Excellent' },
  { facultyId: 2, subjectId: 2, scores: [7, 8, 9, 8, 7, 6, 8, 7, 8, 9], remark: 'Good' },
];


app.get('/feedback', (req, res) => {
  res.render('feedback', { subjects, faculties });
});


app.post("/signup", (req, res) => { 
  res.render('login')
});

app.post("/login", (req, res) => {
  res.render('feedback',{ subjects, faculties })
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
          const averageScore = totalScore / (feedbackData.length * 10); // Assuming each feedback has 10 questions
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
