import { PrismaClient } from '../../generated/prisma/index.js';
import axios from 'axios';

const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    return {
      success: true,
      message: "Successfully connected to MySQL Database",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to connect to Database",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const seedProjectsData = async () => {
  try {
    const projects = [
      { projectCode: 'J4E89B2F', department: 'Dept1' },
      { projectCode: 'H9A53C7D', department: 'Dept1' },
      { projectCode: 'G2D71E5A', department: 'Dept2' },
      { projectCode: 'F6C28A4B', department: 'Dept2' },
      { projectCode: 'A9F41C3E', department: 'Dept3' },
      { projectCode: 'B7E82A9D', department: 'Dept3' },
      { projectCode: 'C3D15F6B', department: 'Dept4' },
      { projectCode: 'D8A94E2C', department: 'Dept4' },
      { projectCode: 'E1B37D9F', department: 'Dept5' },
      { projectCode: 'K7D12F6A', department: 'Dept5' },
    ];

    await prisma.project.createMany({
      data: projects,
      skipDuplicates: true
    });

    console.log(`✅ Seeded ${projects.length} projects successfully`);
    return {
      success: true,
      message: `Projects seeded successfully`,
      count: projects.length
    };
  } catch (error) {
    console.error('❌ Error seeding projects:', error);
    return {
      success: false,
      message: "Failed to seed projects",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const syncUsersFromAPI = async () => {
  try {
    const apiUrl = process.env.USER_SYNC_API_URL!
    console.log(`🔄 Fetching users from: ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      timeout: 10000, 
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AttendanceApp-Backend/1.0.0'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid API response format');
    }

    const users = response.data;
    console.log(`📥 Received ${users.length} users from API`);

    const syncResults = {
      created: 0,
      updated: 0,
      errors: 0,
      userProjectsCreated: 0
    };

    for (const userData of users) {
      try {
        if (!userData.employeeId || !userData.username || !userData.projectKey) {
          console.warn('⚠️ Skipping user with missing data:', userData);
          syncResults.errors++;
          continue;
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { employeeNumber: userData.employeeId }
        });

        if (!existingUser) {
          // Create new user
          await prisma.user.create({
            data: {
              employeeNumber: userData.employeeId,
              username: userData.username,
              empClass: 'PJ'
            }
          });
          syncResults.created++;
        } else {
          // Update username if changed
          if (existingUser.username !== userData.username) {
            await prisma.user.update({
              where: { employeeNumber: userData.employeeId },
              data: { username: userData.username }
            });
            syncResults.updated++;
          }
        }

        // Check if project exists
        const projectExists = await prisma.project.findUnique({
          where: { projectCode: userData.projectKey }
        });

        if (!projectExists) {
          console.warn(`⚠️ Project ${userData.projectKey} not found for user ${userData.username}`);
          continue;
        }

        // Check if user-project relation exists
        const relationExists = await prisma.userProjectRelation.findUnique({
          where: {
            employeeNumber_projectCode: {
              employeeNumber: userData.employeeId,
              projectCode: userData.projectKey
            }
          }
        });

        if (!relationExists) {
          // Create user-project relation
          await prisma.userProjectRelation.create({
            data: {
              employeeNumber: userData.employeeId,
              projectCode: userData.projectKey
            }
          });
          syncResults.userProjectsCreated++;
        }

      } catch (userError) {
        console.error(`❌ Error processing user ${userData.username}:`, userError);
        syncResults.errors++;
      }
    }

    console.log('✅ User sync completed:', syncResults);
    return {
      success: true,
      message: "Users synced successfully",
      results: syncResults
    };

  } catch (error) {
    console.error('❌ Error syncing users from API:', error);
    return {
      success: false,
      message: "Failed to sync users from API",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const seedBasicCalendar = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const weekendDates = [];

    // Generate all weekend dates for the current year
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(currentYear, month, day, 12));
        const dayOfWeek = date.getDay();
        
        // Check if weekend (Saturday = 6, Sunday = 0)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendDates.push({
            date: date,
            description: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
            isHoliday: true,
            isWeekend: true
          });
        }
      }
    }

    await prisma.calendar.createMany({
      data: weekendDates,
      skipDuplicates: true
    });

    console.log(`✅ Seeded ${weekendDates.length} weekend dates for ${currentYear}`);
    return {
      success: true,
      message: `Basic calendar seeded for ${currentYear}`,
      count: weekendDates.length
    };

  } catch (error) {
    console.error('❌ Error seeding basic calendar:', error);
    return {
      success: false,
      message: "Failed to seed basic calendar",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const seedPIData = async () => {
  try {
    // Create PI users
    const piData = [
      { username: 'PIUser1', password: '123456', projectCode: 'J4E89B2F' },
      { username: 'PIUser2', password: '123456', projectCode: 'A9F41C3E' },
      { username: 'PIUser3', password: '123456', projectCode: 'D8A94E2C' }
    ];

    // Create PIs
    await prisma.pI.createMany({
      data: piData,
      skipDuplicates: true
    });

    console.log(`✅ Seeded ${piData.length} PIs successfully`);
    
    // Define PI project assignments
    const piProjectAssignments = [
      { username: 'PIUser1', projects: ['J4E89B2F', 'H9A53C7D', 'G2D71E5A', 'F6C28A4B'] },
      { username: 'PIUser2', projects: ['A9F41C3E', 'B7E82A9D', 'C3D15F6B'] },
      { username: 'PIUser3', projects: ['D8A94E2C', 'E1B37D9F', 'K7D12F6A'] }
    ];

    // Create PI-Project relations
    const piProjectRelations = [];
    for (const assignment of piProjectAssignments) {
      const pi = await prisma.pI.findUnique({
        where: { username: assignment.username }
      });
      
      if (pi) {
        for (const projectCode of assignment.projects) {
          if (projectCode) {
            piProjectRelations.push({
              principalInvestigatorKey: pi.principalInvestigatorKey,
              projectCode: projectCode
            });
          }
        }
      }
    }

    // Create all relations
    if (piProjectRelations.length > 0) {
      await prisma.pIProjectRelation.createMany({
        data: piProjectRelations,
        skipDuplicates: true
      });

      console.log(`✅ Created ${piProjectRelations.length} PI-Project relations successfully`);
    }

    // Log distribution
    console.log('PI-Project Distribution:');
    piProjectAssignments.forEach(assignment => {
      console.log(`  - ${assignment.username}: ${assignment.projects.length} projects (${assignment.projects.join(', ')})`);
    });

    return {
      success: true,
      message: `PIs and relations seeded successfully`,
      count: piData.length
    };
  } catch (error) {
    console.error('❌ Error seeding PIs:', error);
    return {
      success: false,
      message: "Failed to seed PIs",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const addHoliday = async (date: Date, description: string) => {
  try {
    const existingCalendar = await prisma.calendar.findUnique({
      where: { date }
    });

    if (existingCalendar) {
      await prisma.calendar.update({
        where: { date },
        data: {
          description,
          isHoliday: true
        }
      });
    } else {
      await prisma.calendar.create({
        data: {
          date,
          description,
          isHoliday: true,
          isWeekend: false
        }
      });
    }

    return {
      success: true,
      message: `Holiday added: ${description} on ${date.toDateString()}`
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to add holiday",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing database...');

    // Connect to database
    const connection = await connectDB();
    if (!connection.success) {
      throw new Error(connection.message);
    }

    // Seed projects
    await seedProjectsData();

    // Seed calendar
    await seedBasicCalendar();

    // Sync users from API
    await syncUsersFromAPI();

    console.log('✅ Database initialization completed successfully');
    return {
      success: true,
      message: "Database initialized successfully"
    };

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return {
      success: false,
      message: "Database initialization failed",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const getDatabaseStats = async () => {
  try {
    const [
      userCount,
      projectCount,
      attendanceCount,
      holidayCount,
      piCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.attendance.count(),
      prisma.calendar.count({ where: { isHoliday: true } }),
      prisma.pI.count()
    ]);

    return {
      success: true,
      stats: {
        users: userCount,
        projects: projectCount,
        attendances: attendanceCount,
        holidays: holidayCount,
        pis: piCount,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to get database statistics",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
    return {
      success: true,
      message: "Database disconnected successfully"
    };
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
    return {
      success: false,
      message: "Failed to disconnect from database",
      error: error instanceof Error ? error.message : error,
    };
  }
};

export default prisma;