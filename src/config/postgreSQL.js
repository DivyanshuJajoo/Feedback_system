import pg from "pg";

const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'Feedback',
  password: '98265764',
  port: 5432,
});
export const connectToDB = () => {
  db.connect((err, Client, release) => {
    if (err) {
      return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL database');
  });
};
export const getDB = () => {
  // console.log(process.env.DB_URL);
  return db;
};
