import { getDB } from "../../config/postgreSQL.js";

let faculties=[];
export default class branchRepository {
  constructor() {
    this.collection = "branch";
  }
  
  async fetchSubjects(semester,discipline_id,unique_id, branchName, yearValue) {
    const db=getDB();
    const branchQuery = {
      text: 'SELECT branch_id FROM branchnew WHERE branch_name = $1',
      values: [branchName]
  };
  
  const branchResult = await db.query(branchQuery);
  
  if (branchResult.rowCount === 0) {
      throw new Error('Branch not found');
  }

  
  const branch_id = branchResult.rows[0].branch_id;

  // console.log(branch_id);

  // Step 2: Get the subject names from the subjectnew table using branch_id, semester, and discipline_id

    
  
  const sqlQuery = {
    text: `SELECT subject_1, subject_2, subject_3, subject_4, subject_5
           FROM student_subject
           WHERE unique_id = $1`,
    values: [unique_id]
  };
  
  console.log(sqlQuery);
  
  try {
    const res = await db.query(sqlQuery);
    console.log(res.rows);  // Log the rows to check what is returned
  
    // Extract subject names from the row (assuming each row has subject_1, subject_2, etc.)
    return res.rows.map(row => {
      // Extract the subject values (subject_1, subject_2, etc.)
      const subjects = Object.values(row).filter(subject => subject != null); // Filter out any null values
      return subjects; // Return the array of subject names
    });
  } catch (err) {
    console.error('Error executing query:', err);
    return [];
  }
}

}
