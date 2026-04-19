import { AppDataSource } from "./data-source";

const seed = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Seeding database...");
    
    // Add seeding logic here
    
    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
};

seed();
