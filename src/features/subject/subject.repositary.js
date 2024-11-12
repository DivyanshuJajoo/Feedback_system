import { getDB } from "../../config/postgreSQL.js";


export default class subjectRepository {
  constructor() {
    this.collection = "subject";
    
  }
  
  async fetchfaculties(subjects, section) {
    const db = getDB();
    let faculties = [];
  
    // Flatten the array if subjects is a 2D array
    const flatSubjects = subjects.flat(); // Flatten the array to remove nesting
  
    // Log to verify the structure of subjects
    console.log('Subjects received:', flatSubjects);
  
    for (const subject of flatSubjects) {
      if (typeof subject !== 'string') {
        throw new Error(`Expected a string subject but got: ${typeof subject}`);
      }
  
      console.log('Processing subject:', subject);
  
      const subjectQuery = {
        text: 'SELECT subject_id FROM subjectnew WHERE name = $1',
        values: [subject]
      };
  
      try {
        const subjectRes = await db.query(subjectQuery);
        if (subjectRes.rowCount === 0) {
          throw new Error(`Subject ${subject} not found`);
        }
        const subject_id = subjectRes.rows[0].subject_id;
  
        const facultyQuery = {
          text: 'SELECT faculty_id, is_elective FROM subject_faculty WHERE subject_id = $1',
          values: [subject_id]
        };
        const facultyRes = await db.query(facultyQuery);
  
        if (facultyRes.rowCount === 0) {
          throw new Error(`No faculty found for subject ${subject}`);
        }
  
        const faculty_id = facultyRes.rows[0].faculty_id;
        const is_elective = facultyRes.rows[0].is_elective;
  
        const facultyNameQuery = {
          text: 'SELECT name FROM faculty WHERE id = $1',
          values: [faculty_id]
        };
        const facultyNameRes = await db.query(facultyNameQuery);
  
        if (facultyNameRes.rowCount === 0) {
          throw new Error(`Faculty name not found for faculty_id ${faculty_id}`);
        }
  
        const faculty_name = facultyNameRes.rows[0].name;
  
        faculties.push({
          subject,
          Assigned_faculty: {
            id: faculty_id,
            faculty_name,
            is_elective
          }
        });
      } catch (err) {
        console.error('Error fetching subjects and faculties:', err);
      }
    }
  
    return faculties;
  }
  
  
}

