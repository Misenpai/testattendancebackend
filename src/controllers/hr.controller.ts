// src/controllers/hr.controller.ts
import type { Request, Response } from "express";
import { PrismaClient, AttendanceType } from "../../generated/prisma/index.js";
import { generateToken } from "../utils/jwt.js";
import { createObjectCsvStringifier } from "csv-writer";
// Import shared state
import { hrRequests, submittedData } from "../shared/state.js";  // Adjust path if needed

const prisma = new PrismaClient();

const HR_USER = { username: "HRUser", password: "123456" };

export const hrLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (username === HR_USER.username && password === HR_USER.password) {
        const token = generateToken({ employeeNumber: 'HR01', username: 'HRUser', empClass: 'HR' });
        return res.json({ success: true, message: "HR Login Successful", token });
    }
    return res.status(401).json({ success: false, error: "Invalid credentials" });
};

export const getAllPIs = async (req: Request, res: Response) => {
    try {
        const pis = await prisma.pI.findMany({
            select: { username: true },
            orderBy: { username: 'asc' }
        });
        const piUsernames = pis.map(p => p.username);
        return res.json({ success: true, data: piUsernames });
    } catch (error) {
        console.error("Failed to fetch PIs from database:", error);
        return res.status(500).json({ success: false, error: "Could not retrieve PI list." });
    }
};

export const requestDataFromPIs = async (req: Request, res: Response) => {
    const { piUsernames, month, year } = req.body;
    if (!piUsernames || !Array.isArray(piUsernames) || !month || !year) {
        return res.status(400).json({ success: false, error: "PI usernames array, month, and year are required." });
    }

    const requestKey = `${month}-${year}`;
    piUsernames.forEach((pi: string) => {
        if (!hrRequests[pi]) hrRequests[pi] = {};
        hrRequests[pi][requestKey] = { requestedAt: Date.now() };
    });

    console.log("HR Requests Updated:", hrRequests);  // This will now log the shared instance
    return res.json({ success: true, message: `Request sent to ${piUsernames.length} PIs for ${requestKey}` });
};

export const getSubmissionStatus = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, error: "Month and year are required." });
        }
        const requestKey = `${month}-${year}`;
        const statuses: Record<string, string> = {};

        const pis = await prisma.pI.findMany({ select: { username: true } });
        const piUsernames = pis.map(p => p.username);

        piUsernames.forEach(pi => {
            const hasSubmitted = submittedData[pi] && submittedData[pi][requestKey];  // Now uses shared submittedData
            const hasRequest = hrRequests[pi] && hrRequests[pi][requestKey];  // Now uses shared hrRequests
            const isPending = hasRequest && !hasSubmitted;

            if (hasSubmitted) {
                const isComplete = submittedData[pi][requestKey].length > 0;
                statuses[pi] = isComplete ? 'complete' : 'pending';
            } else if (isPending) {
                statuses[pi] = 'requested';
            } else {
                statuses[pi] = 'none';
            }
        });

        return res.json({ success: true, data: statuses });
    } catch (error) {
        console.error("Failed to get submission statuses:", error);
        return res.status(500).json({ success: false, error: "Could not retrieve submission statuses." });
    }
};

export const downloadReport = async (req: Request, res: Response) => {
    const { piUsernames, month, year } = req.query;
    if (!piUsernames || !month || !year) {
        return res.status(400).json({ success: false, error: "Missing required parameters." });
    }
    const piList = (piUsernames as string).split(',');
    const requestKey = `${month}-${year}`;

    const queryYear = parseInt(year as string);
    const queryMonth = parseInt(month as string);
    const startDate = new Date(Date.UTC(queryYear, queryMonth - 1, 1));
    const endDate = new Date(Date.UTC(queryYear, queryMonth, 0));

    const calendarDays = await prisma.calendar.findMany({ where: { date: { gte: startDate, lte: endDate } } });
    const totalWorkingDays = calendarDays.filter(d => !d.isHoliday && !d.isWeekend).length;

    let allUsersData: any[] = [];
    piList.forEach(pi => {
        if (submittedData[pi]?.[requestKey]) {  // Now uses shared submittedData
            allUsersData = [...allUsersData, ...submittedData[pi][requestKey]];
        }
    });

    if (allUsersData.length === 0) {
        return res.status(404).json({ success: false, error: "No data has been submitted for the selected criteria." });
    }

    const records = allUsersData.map(user => {
        const workingDays = user.monthlyStatistics.totalDays;
        const absentDays = Math.max(0, totalWorkingDays - workingDays);
        return {
            Project_Staff_Name: user.username,
            'Working Days (Present Day)': workingDays.toFixed(1),
            'Absent Days': absentDays.toFixed(1)
        };
    });

    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'Project_Staff_Name', title: 'Project_Staff_Name' },
            { id: 'Working Days (Present Day)', title: 'Working Days (Present Day)' },
            { id: 'Absent Days', title: 'Absent Days' }
        ]
    });

    const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    const fileName = piList.length > 1 ? `Combined_Report_${month}_${year}.csv` : `${piList[0]}_Report_${month}_${year}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(csvData);
};