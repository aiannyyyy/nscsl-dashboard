const { database } = require('../../config');

// ─── Default Thresholds ───────────────────────────────────────────────────────
const LAB_DEFAULT_CRITICAL_THRESHOLD = 10;
const LAB_DEFAULT_WARNING_THRESHOLD  = 20;
const LAB_DEFAULT_UNIT               = 'units';

// ─── Tracked Item Codes ───────────────────────────────────────────────────────
const LAB_SUPPLIES_ITEM_CODES = [
    'LAB001', 'LAB002', 'LAB003', 'LAB004', 'LAB008', 'LAB010', 'LAB012',
    'LAB013', 'LAB015', 'LAB034', 'LAB035', 'LAB040', 'LAB044', 'LAB046',
    'LAB047', 'LAB049', 'LAB051', 'LAB052', 'LAB056', 'LAB062', 'LAB071',
    'LAB073', 'LAB080', 'LAB081', 'LAB084', 'LAB091', 'LAB128', 'LAB129',
    'LAB130',
];

// ─── Item Thresholds ──────────────────────────────────────────────────────────
const itemThresholds = {
    'LAB002': { critical: 1000, warning: 1200, unit: 'pcs'    },
    'LAB003': { critical: 3,    warning: 5,    unit: 'boxes'  },
    'LAB004': { critical: 5,    warning: 7,    unit: 'boxes'  },
    'LAB008': { critical: 2,    warning: 4,    unit: 'boxes'  },
    'LAB010': { critical: 4,    warning: 6,    unit: 'boxes'  },
    'LAB012': { critical: 2,    warning: 4,    unit: 'boxes'  },
    'LAB013': { critical: 2,    warning: 4,    unit: 'boxes'  },
    'LAB015': { critical: 1,    warning: 2,    unit: 'box'    },
    'LAB034': { critical: 2,    warning: 4,    unit: 'rolls'  },
    'LAB035': { critical: 1,    warning: 2,    unit: 'box'    },
    'LAB047': { critical: 0.5,  warning: 1,    unit: 'pack'   },
    'LAB049': { critical: 110,  warning: 130,  unit: 'plates' },
    'LAB051': { critical: 0.5,  warning: 1,    unit: 'pack'   },
    'LAB052': { critical: 2,    warning: 4,    unit: 'boxes'  },
    'LAB062': { critical: 1,    warning: 2,    unit: 'pack'   },
    'LAB071': { critical: 1,    warning: 2,    unit: 'pack'   },
    'LAB073': { critical: 1,    warning: 2,    unit: 'pack'   },
    'LAB080': { critical: 1,    warning: 2,    unit: 'pack'   },
    'LAB081': { critical: 1,    warning: 2,    unit: 'pack'   },
    'LAB128': { critical: 1,    warning: 2,    unit: 'pack'   },
    'LAB129': { critical: 0.6,  warning: 1.2,  unit: 'pack'   },
    'LAB130': { critical: 1,    warning: 2,    unit: 'pack'   },
    // ↓ in ITEM_CODES but missing from thresholds — using defaults (update when values are known)
    'LAB001': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
    'LAB040': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
    'LAB044': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
    'LAB046': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
    'LAB056': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
    'LAB084': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
    'LAB091': { critical: LAB_DEFAULT_CRITICAL_THRESHOLD, warning: LAB_DEFAULT_WARNING_THRESHOLD, unit: LAB_DEFAULT_UNIT },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getSupplyThresholds = (itemCode) => {
    return itemThresholds[itemCode] ?? {
        critical: LAB_DEFAULT_CRITICAL_THRESHOLD,
        warning:  LAB_DEFAULT_WARNING_THRESHOLD,
        unit:     LAB_DEFAULT_UNIT,
    };
};

const getSupplyStatus = (itemCode, stock) => {
    const { critical, warning } = getSupplyThresholds(itemCode);
    if (stock <= 0)        return 'out-of-stock';
    if (stock <= critical) return 'critical';
    if (stock <= warning)  return 'warning';
    return 'normal';
};

// ─── Controller ───────────────────────────────────────────────────────────────
exports.getLabSupplies = async (req, res) => {
    try {
        const placeholders = LAB_SUPPLIES_ITEM_CODES.map(() => '?').join(', ');

        const sql = `
            SELECT
                itemcode       AS itemCode,
                description,
                stocks_on_hand AS stock
            FROM inventory.lab_supplies
            WHERE itemcode IN (${placeholders})
            ORDER BY itemcode ASC
        `;

        const [rows] = await database.mysqlPool.query(sql, LAB_SUPPLIES_ITEM_CODES);

        const enrichedData = rows.map(item => {
            const stock      = Number(item.stock);
            const thresholds = getSupplyThresholds(item.itemCode);

            return {
                itemCode:    item.itemCode,
                description: item.description,
                stock,
                unit:        thresholds.unit,
                status:      getSupplyStatus(item.itemCode, stock),
                thresholds,
            };
        });

        console.log(`📊 Total lab supplies fetched: ${enrichedData.length}`);

        return res.json({
            success:   true,
            count:     enrichedData.length,
            data:      enrichedData,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('❌ Lab Supplies Controller Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch laboratory supplies',
        });
    }
};