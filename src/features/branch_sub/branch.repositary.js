import { getDB } from "../../config/postgreSQL.js";

let faculties=[];
export default class branchRepository {
  constructor() {
    this.collection = "branch";
  }
  
  async fetchSubjects(semester,discipline_id,unique_id, branchName, yearValue) {
    const db = getDB();
  
  // Step 1: Fetch branch_id using branchName
  const branchQuery = {
    text: 'SELECT branch_id FROM branchnew WHERE branch_name = $1',
    values: [branchName]
  };
  
  const branchResult = await db.query(branchQuery);
  if (branchResult.rowCount === 0) {
    throw new Error('Branch not found');
  }
  
  const branch_id = branchResult.rows[0].branch_id;

  // Step 2: Get all subjects for the branch, discipline, and semester from subjectnew
  const subjectsQuery = {
    text: `
      SELECT sn.subject_id, sn.name, sf.is_elective
      FROM subjectnew sn
      LEFT JOIN subject_faculty sf ON sn.subject_id = sf.subject_id
      WHERE sn.branch_id = $1 AND sn.discipline_id = $2 AND sn.semester = $3
    `,
    values: [branch_id, discipline_id, semester]
  };

  const subjectsResult = await db.query(subjectsQuery);
  const subjectsArray = [];

  // Add non-elective subjects to the array
  subjectsResult.rows.forEach((subject) => {
    if (!subject.is_elective) {
      subjectsArray.push(subject.name);
    }
  });

  // Step 3: Fetch student-specific elective subjects from student_subject
  const studentSubjectsQuery = {
    text: `
      SELECT subject_1, subject_2, subject_3, subject_4, subject_5
      FROM student_subject
      WHERE unique_id = $1
    `,
    values: [unique_id]
  };

  try {
    const studentSubjectsResult = await db.query(studentSubjectsQuery);

    // Add non-null student-specific subjects to the array
    studentSubjectsResult.rows.forEach((row) => {
      Object.values(row).forEach((subject) => {
        if (subject) {
          subjectsArray.push(subject);
        }
      });
    });

    // Return the complete subjects array
    return subjectsArray;
  } catch (err) {
    console.error('Error fetching student-specific subjects:', err);
    return [];
  }

}

}
