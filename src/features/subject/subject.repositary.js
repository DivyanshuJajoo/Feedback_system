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
        const subjectQuery = {
          text: 'SELECT subject_id FROM subjectnew WHERE name = $1',
          values: [subject]
      };
      const subjectRes = await db.query(subjectQuery);
      if (subjectRes.rowCount === 0) {
        throw new Error(`Subject ${subject} not found`);
    }
    const subject_id = subjectRes.rows[0].subject_id;

    const facultyQuery = {
      text: 'SELECT faculty_id FROM subject_faculty WHERE subject_id = $1',
      values: [subject_id]
  };
  const facultyRes = await db.query(facultyQuery);
  
  if (facultyRes.rowCount === 0) {
      throw new Error(`No faculty found for subject ${subject}`);
  }

  const faculty_id = facultyRes.rows[0].faculty_id;

        
  const facultyNameQuery = {
    text: 'SELECT name FROM faculty WHERE id = $1',
    values: [faculty_id]
};
const facultyNameRes = await db.query(facultyNameQuery);

if (facultyNameRes.rowCount === 0) {
    throw new Error(`Faculty name not found for faculty_id ${faculty_id}`);
}

const faculty_name = facultyNameRes.rows[0].name;
        try{
          faculties.push({
            subject,
            Assigned_faculty: {
                id: faculty_id,
                faculty_name
            }
        });
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

