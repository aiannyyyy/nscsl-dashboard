const oracleDb = require("oracledb");

// ─────────────────────────────────────────────────────────────
// EXISTING — Refined: filters by specific SUBMIDs, no county
// ─────────────────────────────────────────────────────────────
exports.getLopezPurchasedFilterCards = async (req, res) => {
  let connection;

  try {
    const { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({ error: "date_from and date_to are required." });
    }

    const submids = [
      "1002", "1071", "1502", "174",  "2283", "2286", "267",  "3471",
      "365",  "3784", "3871", "3978", "4305", "4459", "4468", "4477",
      "469",  "4705", "4710", "4781", "4801", "4802", "4810", "488",
      "4880", "4890", "490",  "497",  "503",  "51",   "537",  "5638",
      "566",  "5686", "576",  "595",  "5958", "6074", "6282", "6390",
      "6399", "6472", "6519", "6915", "6976", "7120", "7293", "7339",
      "858",  "930",
    ];

    const submidBinds = {};
    const submidPlaceholders = submids.map((id, i) => {
      submidBinds[`s${i}`] = id;
      return `:s${i}`;
    }).join(", ");

    connection = await oracleDb.getConnection();

    const query = `
      SELECT
        rpa.CITY,
        rpa.PROVIDERID  AS SUBMID,
        rpa.DESCR1,
        COUNT(frm.LABID) AS TOTAL_COUNT
      FROM PHMSDS.FILTER_REG_MASTER frm
      JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa
        ON TRIM(frm.SUBMID) = TRIM(rpa.PROVIDERID)
      WHERE rpa.ADRS_TYPE = '1'
        AND TRIM(rpa.PROVIDERID) IN (${submidPlaceholders})
        AND frm.DATE_RELEASED >= TO_TIMESTAMP(:date_from, 'YYYY-MM-DD HH24:MI:SS')
        AND frm.DATE_RELEASED <  TO_TIMESTAMP(:date_to,   'YYYY-MM-DD HH24:MI:SS')
      GROUP BY rpa.CITY, rpa.PROVIDERID, rpa.DESCR1
      ORDER BY rpa.CITY, rpa.PROVIDERID
    `;

    const result = await connection.execute(
      query,
      {
        ...submidBinds,
        date_from: `${date_from} 00:00:00`,
        date_to:   `${date_to} 23:59:59`,
      },
      { outFormat: oracleDb.OUT_FORMAT_OBJECT }
    );

    const grouped = {};
    for (const row of result.rows) {
      const city = row.CITY?.trim();
      if (!grouped[city]) {
        grouped[city] = { city, total_count: 0, breakdown: [] };
      }
      grouped[city].total_count += row.TOTAL_COUNT;
      grouped[city].breakdown.push({
        submid:      row.SUBMID?.trim(),
        descr1:      row.DESCR1?.trim(),
        total_count: row.TOTAL_COUNT,
      });
    }

    return res.status(200).json({
      success: true,
      data:    Object.values(grouped),
    });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Internal server error.", details: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); }
      catch (closeErr) { console.error("Error closing connection:", closeErr); }
    }
  }
};


// ─────────────────────────────────────────────────────────────
// NEW — CALABARZON: CAVITE, LAGUNA, BATANGAS, RIZAL, QUEZON
// ─────────────────────────────────────────────────────────────
exports.getCalabarzOnPurchasedFilterCards = async (req, res) => {
  let connection;

  try {
    const { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({ error: "date_from and date_to are required." });
    }

    const counties = ["CAVITE", "LAGUNA", "BATANGAS", "RIZAL", "QUEZON"];

    const countyBinds = {};
    const countyPlaceholders = counties.map((c, i) => {
      countyBinds[`c${i}`] = c;
      return `:c${i}`;
    }).join(", ");

    connection = await oracleDb.getConnection();

    const query = `
      SELECT
        TRIM(UPPER(rpa.COUNTY))    AS COUNTY,
        TRIM(rpa.CITY)             AS CITY,
        TRIM(rpa.PROVIDERID)       AS SUBMID,
        TRIM(rpa.DESCR1)           AS DESCR1,
        COUNT(frm.LABID)           AS TOTAL_COUNT
      FROM PHMSDS.FILTER_REG_MASTER frm
      JOIN PHMSDS.REF_PROVIDER_ADDRESS rpa
        ON TRIM(frm.SUBMID) = TRIM(rpa.PROVIDERID)
      WHERE rpa.ADRS_TYPE = '1'
        AND TRIM(UPPER(rpa.COUNTY)) IN (${countyPlaceholders})
        AND frm.DATE_RELEASED >= TO_TIMESTAMP(:date_from, 'YYYY-MM-DD HH24:MI:SS')
        AND frm.DATE_RELEASED <  TO_TIMESTAMP(:date_to,   'YYYY-MM-DD HH24:MI:SS')
      GROUP BY rpa.COUNTY, rpa.CITY, rpa.PROVIDERID, rpa.DESCR1
      ORDER BY rpa.COUNTY, rpa.CITY, rpa.PROVIDERID
    `;

    const result = await connection.execute(
      query,
      {
        ...countyBinds,
        date_from: `${date_from} 00:00:00`,
        date_to:   `${date_to} 23:59:59`,
      },
      { outFormat: oracleDb.OUT_FORMAT_OBJECT }
    );

    // Group: COUNTY → CITY → breakdown[]
    const grouped = {};
    for (const row of result.rows) {
      const county = row.COUNTY;   // already TRIM(UPPER) from SELECT
      const city   = row.CITY;     // already TRIM from SELECT

      if (!grouped[county]) {
        grouped[county] = { county, total_count: 0, cities: {} };
      }

      if (!grouped[county].cities[city]) {
        grouped[county].cities[city] = { city, total_count: 0, breakdown: [] };
      }

      grouped[county].total_count              += row.TOTAL_COUNT;
      grouped[county].cities[city].total_count += row.TOTAL_COUNT;
      grouped[county].cities[city].breakdown.push({
        submid:      row.SUBMID,
        descr1:      row.DESCR1,
        total_count: row.TOTAL_COUNT,
      });
    }

    const data = Object.values(grouped).map(c => ({
      county:      c.county,
      total_count: c.total_count,
      cities:      Object.values(c.cities),
    }));

    return res.status(200).json({ success: true, data });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Internal server error.", details: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); }
      catch (closeErr) { console.error("Error closing connection:", closeErr); }
    }
  }
};