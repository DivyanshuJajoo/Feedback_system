import { getDB } from "../../config/postgreSQL.js";


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
    let faculties=[];
      for (const subject of subjects) {
        const facultyQuery = {
          text: 'SELECT faculty_name FROM Subject WHERE subject_name = $1 and section= $2',
          values: [subject,section]
        };
        const facultyidQuery = {
          text: 'SELECT fac_id FROM Subject WHERE subject_name = $1 and section= $2',
          values: [subject,section]
        };
        try{
        const facultyRes = await db.query(facultyQuery);
        const facultyidRes = await db.query(facultyidQuery);
        const facultiesForSubject = facultyRes.rows.map(row => row.faculty_name);
        const facultiesidForSubject = facultyidRes.rows.map(row => row.fac_id);
        const Assigned_faculty={id:facultiesidForSubject[0],faculty_name:facultiesForSubject[0]};
        // console.log(facultiesForSubject);
        faculties.push({subject,Assigned_faculty});
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

