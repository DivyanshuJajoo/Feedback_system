import { getDB } from "../../config/postgreSQL.js";

let faculties=[];
export default class branchRepository {
  constructor() {
    this.collection = "branch";
  }
  
  async fetchSubjects(semester,discipline_id, branchName, yearValue) {
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
      text: `SELECT name 
             FROM subjectnew 
             WHERE branch_id = $1 AND semester = $2 AND discipline_id = $3`,
      values: [branch_id, semester, discipline_id]
  };

    
  
    try {
      const res = await db.query(sqlQuery);
      // console.log(res.rows.map(row => row.name));
      return res.rows.map(row => row.name);
    } catch (err) {
      console.error('Error executing query:', err);
      return [];
    }
  }

}
