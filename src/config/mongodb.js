import { MongoClient } from "mongodb";
let client;
export const connectToMongoDB = () => {
  MongoClient.connect(process.env.DB_URL)
    .then((clientInstance) => {
      client = clientInstance;
      console.log("Mongodb is connected");
    })
    .catch((err) => {
      console.log(err);
    });
};
export const getDB = () => {
  // console.log(process.env.DB_URL);
  return client.db();
};
