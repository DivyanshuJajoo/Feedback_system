import { getDB } from "../../config/postgreSQL.js";

let faculties=[];
export default class subjectRepository {
  constructor() {
    this.collection = "subject";
    
  }
  
  async fetchfaculties(subjects,section) {
    // console.log(subject);
    // const facultyQuery = {
    //   text: 'SELECT faculty_name FROM subject WHERE subject_name = $1',
    //   values: [subject]
    // };
    const db=getDB();
    
      for (const subject of subjects) {
        const facultyQuery = {
          text: 'SELECT faculty_name FROM Subject WHERE subject_name = $1 and section= $2',
          values: [subject,section]
        };
        try{
        const facultyRes = await db.query(facultyQuery);
        const facultiesForSubject = facultyRes.rows.map(row => row.faculty_name);
        // console.log(facultiesForSubject);
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
}

