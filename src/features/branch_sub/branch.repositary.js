import { getDB } from "../../config/postgreSQL.js";

let faculties=[];
export default class branchRepository {
  constructor() {
    this.collection = "branch";
  }
  
  async fetchSubjects(branchName, yearValue) {
    const db=getDB();
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

}
