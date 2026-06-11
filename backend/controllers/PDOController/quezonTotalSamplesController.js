const oracleDb = require("oracledb");

// GET /api/samples/quezon?date_from=2026-05-01&date_to=2026-05-31&county=BATANGAS
exports.getTotalSamplesQuezon = async (req, res) => {
  let connection;

  try {
    const { date_from, date_to, county } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({ error: "date_from and date_to are required." });
    }

    if (!county) {
      return res.status(400).json({ error: "county is required." });
    }

    connection = await oracleDb.getConnection();

    const query = `
      SELECT
        sda.LABNO,
        sda.SPECTYPE,
        sda.DTRECV,
        sda.SUBMID,
        rpa.ADRS_TYPE,
        rpa.CITY,
        rpa.COUNTY,
        rpa.DESCR1
      FROM
        PHMSDS.SAMPLE_DEMOG_ARCHIVE sda,
        PHMSDS.REF_PROVIDER_ADDRESS rpa
      WHERE
        sda.SUBMID     = rpa.PROVIDERID
        AND sda.DTRECV >= TO_TIMESTAMP(:date_from, 'YYYY-MM-DD HH24:MI:SS')
        AND sda.DTRECV <  TO_TIMESTAMP(:date_to,   'YYYY-MM-DD HH24:MI:SS')
        AND rpa.ADRS_TYPE = '1'
        AND TRIM(UPPER(rpa.COUNTY)) = TRIM(UPPER(:county))
        AND sda.SPECTYPE  = '20'

      UNION ALL

      SELECT
        sdm.LABNO,
        sdm.SPECTYPE,
        sdm.DTRECV,
        sdm.SUBMID,
        rpa.ADRS_TYPE,
        rpa.CITY,
        rpa.COUNTY,
        rpa.DESCR1
      FROM
        PHMSDS.SAMPLE_DEMOG_MASTER sdm,
        PHMSDS.REF_PROVIDER_ADDRESS rpa
      WHERE
        sdm.SUBMID     = rpa.PROVIDERID
        AND sdm.DTRECV >= TO_TIMESTAMP(:date_from, 'YYYY-MM-DD HH24:MI:SS')
        AND sdm.DTRECV <  TO_TIMESTAMP(:date_to,   'YYYY-MM-DD HH24:MI:SS')
        AND rpa.ADRS_TYPE = '1'
        AND TRIM(UPPER(rpa.COUNTY)) = TRIM(UPPER(:county))
        AND sdm.SPECTYPE  = '20'
    `;

    const result = await connection.execute(
      query,
      {
        date_from: `${date_from} 00:00:00`,
        date_to:   `${date_to} 23:59:59`,
        county:    county.toUpperCase().trim(),
      },
      { outFormat: oracleDb.OUT_FORMAT_OBJECT }
    );

    const grouped = {};
    for (const row of result.rows) {
      const city = row.CITY;
      if (!grouped[city]) {
        grouped[city] = {
          city,
          county: row.COUNTY,
          total_count: 0,
          breakdown: [],
        };
      }
      grouped[city].total_count += 1;

      const existing = grouped[city].breakdown.find((b) => b.submid === row.SUBMID);
      if (existing) {
        existing.total_count += 1;
      } else {
        grouped[city].breakdown.push({
          submid:      row.SUBMID,
          descr1:      row.DESCR1,
          total_count: 1,
        });
      }
    }

    return res.status(200).json({
      success:       true,
      total_records: result.rows.length,
      county:        county.toUpperCase().trim(),
      data:          Object.values(grouped),
    });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Internal server error.", details: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error("Error closing connection:", closeErr);
      }
    }
  }
};


// GET /api/samples/nearby-lopez?date_from=2026-05-01&date_to=2026-05-31
exports.getTotalSamplesNearbyLopez = async (req, res) => {
  let connection;

  try {
    const { date_from, date_to } = req.query;

    if (!date_from || !date_to) {
      return res.status(400).json({ error: "date_from and date_to are required." });
    }

    connection = await oracleDb.getConnection();

    // Add or remove SUBMID values in this array as needed
    const submidList = ["1002", "1071", "1502", "174", "2283", "2286", "267", "3471", "365", "3784", "3871", "3978", "4305", "4459", "4468", "4477", "469", "4705", "4710", "4781", "4801", "4802", "4810", "488", "4880", "4890", "490", "497", "503", "51", "537", "5638", "566", "5686", "576", "595", "5958", "6074", "6282", "6390", "6399", "6472", "6519", "6915", "6976", "7120", "7293", "7339", "858", "930"];
    const submidBinds = {};
    submidList.forEach((id, i) => {
      submidBinds[`submid_${i}`] = id;
    });
    const submidClause = submidList
      .map((_, i) => `:submid_${i}`)
      .join(", ");

    const query = `
      SELECT
        sda.LABNO,
        sda.SPECTYPE,
        sda.DTRECV,
        sda.SUBMID,
        rpa.ADRS_TYPE,
        rpa.CITY,
        rpa.DESCR1
      FROM
        PHMSDS.SAMPLE_DEMOG_ARCHIVE sda,
        PHMSDS.REF_PROVIDER_ADDRESS rpa
      WHERE
        sda.SUBMID     = rpa.PROVIDERID
        AND sda.DTRECV >= TO_TIMESTAMP(:date_from, 'YYYY-MM-DD HH24:MI:SS')
        AND sda.DTRECV <  TO_TIMESTAMP(:date_to,   'YYYY-MM-DD HH24:MI:SS')
        AND rpa.ADRS_TYPE  = '1'
        AND sda.SUBMID    IN (${submidClause})
        AND sda.SPECTYPE  = '20'

      UNION ALL

      SELECT
        sdm.LABNO,
        sdm.SPECTYPE,
        sdm.DTRECV,
        sdm.SUBMID,
        rpa.ADRS_TYPE,
        rpa.CITY,
        rpa.DESCR1
      FROM
        PHMSDS.SAMPLE_DEMOG_MASTER sdm,
        PHMSDS.REF_PROVIDER_ADDRESS rpa
      WHERE
        sdm.SUBMID     = rpa.PROVIDERID
        AND sdm.DTRECV >= TO_TIMESTAMP(:date_from, 'YYYY-MM-DD HH24:MI:SS')
        AND sdm.DTRECV <  TO_TIMESTAMP(:date_to,   'YYYY-MM-DD HH24:MI:SS')
        AND rpa.ADRS_TYPE  = '1'
        AND sdm.SUBMID    IN (${submidClause})
        AND sdm.SPECTYPE  = '20'
    `;

    const result = await connection.execute(
      query,
      {
        date_from: `${date_from} 00:00:00`,
        date_to:   `${date_to} 23:59:59`,
        ...submidBinds,
      },
      { outFormat: oracleDb.OUT_FORMAT_OBJECT }
    );

    // Group by CITY with breakdown per SUBMID/DESCR1
    const grouped = {};
    for (const row of result.rows) {
      const city = row.CITY;
      if (!grouped[city]) {
        grouped[city] = {
          city,
          total_count: 0,
          breakdown: [],
        };
      }
      grouped[city].total_count += 1;

      const existing = grouped[city].breakdown.find((b) => b.submid === row.SUBMID);
      if (existing) {
        existing.total_count += 1;
      } else {
        grouped[city].breakdown.push({
          submid: row.SUBMID,
          descr1: row.DESCR1,
          total_count: 1,
        });
      }
    }

    return res.status(200).json({
      success: true,
      total_records: result.rows.length,
      data: Object.values(grouped),
    });

  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: "Internal server error.", details: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error("Error closing connection:", closeErr);
      }
    }
  }
};