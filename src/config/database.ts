import mongoose from "mongoose";
import { Logger } from "../utils/logger";

export class Database {
  static async connect() {
    const uri =
      process.env.MONGODB_URI ||
      "mongodb+srv://kaoruko-bot-database:lefNRkCzDEbuw6vh@cluster0.kihe5zx.mongodb.net/kaoruko-bot?retryWrites=true&w=majority&appName=Cluster0";

    try {
      await mongoose.connect(uri);
      Logger.success("Connected to MongoDB database");
    } catch (error) {
      Logger.error(`Failed to connect to MongoDB: ${error}`);
      process.exit(1);
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      Logger.info("Disconnected from MongoDB database");
    } catch (error) {
      Logger.error(`Error disconnecting from MongoDB: ${error}`);
    }
  }
}
