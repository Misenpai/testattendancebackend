import { seedProjectsData, seedBasicCalendar, syncUsersFromAPI, initializeDatabase } from '../config/db.js';

const runSeed = async () => {
  try {
    // console.log('🌱 Starting database seeding...');

    // console.log('📦 Seeding projects...');
    // await seedProjectsData();

    // console.log('📅 Seeding calendar...');
    // await seedBasicCalendar();

    // console.log('👥 Syncing users...');
    // await syncUsersFromAPI();

    await initializeDatabase();

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

runSeed();