const { database } = require("../../config");

const DB_TABLE = "test_nscslcom_nscsl_dashboard.logbook_endorsement";

// Get Total Recall Per Month (current + last month) //
const getTotalRecallPerMonth = async (_req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth() + 1;

        const [rows] = await database.mysqlPool.query(
            `SELECT
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
                     AND fun_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) + INTERVAL '23:59:59' HOUR_SECOND
                    THEN 1 ELSE 0
                END) AS current_month,
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
                     AND fun_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) + INTERVAL '23:59:59' HOUR_SECOND
                    THEN 1 ELSE 0
                END) AS last_month
            FROM ${DB_TABLE}
            WHERE fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')`,
            [year, month, year, month, lastYear, lastMonth, lastYear, lastMonth, lastYear, lastMonth]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error("[followupSummaryController] getTotalRecallPerMonth error", error);
        return res.status(500).json({ success: false, error: "Failed to fetch total recall per month" });
    }
};

// Get Total Recall Per Day (today + yesterday) //
const getTotalRecallPerDay = async (_req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yYear = yesterday.getFullYear();
        const yMonth = yesterday.getMonth() + 1;
        const yDay = yesterday.getDate();

        const [rows] = await database.mysqlPool.query(
            `SELECT
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'), ' 00:00:00')
                     AND fun_date <= CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'), ' 23:59:59')
                    THEN 1 ELSE 0
                END) AS today_count,
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'), ' 00:00:00')
                     AND fun_date <= CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'), ' 23:59:59')
                    THEN 1 ELSE 0
                END) AS yesterday_count,
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
                     AND fun_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) + INTERVAL '23:59:59' HOUR_SECOND
                    THEN 1 ELSE 0
                END) AS month_count
            FROM ${DB_TABLE}
            WHERE fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')`,
            [
                year, month, day, year, month, day,
                yYear, yMonth, yDay, yYear, yMonth, yDay,
                year, month, year, month,
                year, month
            ]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error("[followupSummaryController] getTotalRecallPerDay error", error);
        return res.status(500).json({ success: false, error: "Failed to fetch total recall per day" });
    }
};

// Get Total Pending (today + yesterday) //
const getTotalPendingWithinDay = async (_req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yYear = yesterday.getFullYear();
        const yMonth = yesterday.getMonth() + 1;
        const yDay = yesterday.getDate();

        const [rows] = await database.mysqlPool.query(
            `SELECT
                SUM(CASE WHEN fun IS NULL AND fun_date IS NULL THEN 1 ELSE 0 END) AS current_pending,
                SUM(CASE
                    WHEN fun IS NULL AND fun_date IS NULL
                     AND DATE(created_at) = CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'))
                    THEN 1 ELSE 0
                END) AS yesterday_pending
            FROM ${DB_TABLE}`,
            [yYear, yMonth, yDay]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error("[followupSummaryController] getTotalPendingWithinDay error", error);
        return res.status(500).json({ success: false, error: "Failed to fetch total pending" });
    }
};

// Get Average Recall Time (current + last month) //
const getAverageRecallTime = async (_req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastYear = lastMonthDate.getFullYear();
        const lastMonth = lastMonthDate.getMonth() + 1;

        const [rows] = await database.mysqlPool.query(
            `SELECT
                ROUND(AVG(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
                     AND fun_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) + INTERVAL '23:59:59' HOUR_SECOND
                    THEN TIMESTAMPDIFF(MINUTE, qao_date, fun_date) END), 2) AS current_avg_minutes,
                ROUND(AVG(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
                     AND fun_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) + INTERVAL '23:59:59' HOUR_SECOND
                    THEN TIMESTAMPDIFF(MINUTE, qao_date, fun_date) END), 2) AS last_avg_minutes
            FROM ${DB_TABLE}
            WHERE fun_date IS NOT NULL
              AND qao_date IS NOT NULL
              AND fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')`,
            [year, month, year, month, lastYear, lastMonth, lastYear, lastMonth, lastYear, lastMonth]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error("[followupSummaryController] getAverageRecallTime error", error);
        return res.status(500).json({ success: false, error: "Failed to fetch average recall time" });
    }
};

// Get Nurse Recall Stats //
const getNurseRecallStats = async (_req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const [rows] = await database.mysqlPool.query(
            `SELECT
                fun AS nurse_name,
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
                     AND fun_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) + INTERVAL '23:59:59' HOUR_SECOND
                    THEN 1 ELSE 0
                END) AS total_recalled_month,
                SUM(CASE
                    WHEN fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'), ' 00:00:00')
                     AND fun_date <= CONCAT(?, '-', LPAD(?, 2, '0'), '-', LPAD(?, 2, '0'), ' 23:59:59')
                    THEN 1 ELSE 0
                END) AS total_recalled_today
            FROM ${DB_TABLE}
            WHERE fun IS NOT NULL
              AND fun_date >= CONCAT(?, '-', LPAD(?, 2, '0'), '-01 00:00:00')
            GROUP BY fun
            ORDER BY total_recalled_month DESC`,
            [year, month, year, month, year, month, day, year, month, day, year, month]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error("[followupSummaryController] getNurseRecallStats error", error);
        return res.status(500).json({ success: false, error: "Failed to fetch nurse recall stats" });
    }
};

module.exports = {
    getTotalRecallPerMonth,
    getTotalRecallPerDay,
    getTotalPendingWithinDay,
    getAverageRecallTime,
    getNurseRecallStats
};