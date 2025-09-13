import mongoose from "mongoose";
import { Logger } from "../utils/logger";

export class Database {
  static async connect() {
    const uri = process.env.MONGODB_URI || "";

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
