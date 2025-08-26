// src/services/fieldTripScheduler.ts
import { PrismaClient, LocationType } from "../../generated/prisma/index.js";
import cron from "node-cron";

const prisma = new PrismaClient();

const IIT_GUWAHATI = {
  lat: 26.1923,
  lng: 91.6951,
  radius: 2000
};

export class FieldTripScheduler {
  private static instance: FieldTripScheduler;

  private constructor() {}

  public static getInstance(): FieldTripScheduler {
    if (!FieldTripScheduler.instance) {
      FieldTripScheduler.instance = new FieldTripScheduler();
    }
    return FieldTripScheduler.instance;
  }

  /** Start the scheduler to run daily at midnight */
  public startScheduler() {
    cron.schedule("0 0 * * *", async () => {
      console.log("Running field-trip restoration check...");
      await this.checkAndRestoreExpiredFieldTrips();
    });

    // Run immediately on startup
    this.checkAndRestoreExpiredFieldTrips();
  }

  /** Check for expired field trips and restore location type */
  public async checkAndRestoreExpiredFieldTrips() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiredFieldTrips = await prisma.fieldTrip.findMany({
        where: {
          isActive: true,
          endDate: { lt: today }
        },
        include: { userLocation: true }
      });

      console.log(`Found ${expiredFieldTrips.length} expired field trips`);

      for (const trip of expiredFieldTrips) {
        await this.processExpiredFieldTrip(trip, today);
      }

      console.log("Field-trip restoration check completed");
    } catch (error) {
      console.error("Error in field-trip restoration check:", error);
    }
  }

  /** Process a single expired field trip */
  private async processExpiredFieldTrip(
    trip: any & { tripKey: string; empCode: string },
    today: Date
  ) {
    try {
      // Mark trip inactive
      await prisma.fieldTrip.update({
        where: { tripKey: trip.tripKey },
        data: { isActive: false }
      });

      // Any remaining active trips for this employee?
      const activeTripsCount = await prisma.fieldTrip.count({
        where: {
          empCode: trip.empCode,
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today }
        }
      });

      // If none left, restore to ABSOLUTE
      if (activeTripsCount === 0 && trip.userLocation.locationType === "FIELDTRIP") {
        await prisma.userLocation.update({
          where: { empCode: trip.empCode },
          data: {
            locationType: LocationType.ABSOLUTE,
            approxLat: null,
            approxLng: null,
            approxRadius: null
          }
        });

        console.log(`Restored ${trip.empCode} to ABSOLUTE`);
      }
    } catch (error) {
      console.error(`Error processing expired field trip for ${trip.empCode}:`, error);
    }
  }

  /** Manual trigger (useful for testing) */
  public async manualCheck() {
    console.log("Manually triggering field-trip restoration check...");
    await this.checkAndRestoreExpiredFieldTrips();
  }
}