const { database } = require('../../config');

// ─── Default Thresholds ───────────────────────────────────────────────────────
const REAGENT_DEFAULT_CRITICAL_THRESHOLD = 10;
const REAGENT_DEFAULT_WARNING_THRESHOLD  = 20;
const REAGENT_DEFAULT_UNIT               = 'units';

// ─── Tracked Item Codes ───────────────────────────────────────────────────────
const REAGENT_ITEM_CODES = [
    'REA005', 'REA006', 'REA007', 'REA008', 'REA019', 'REA025',
    'REA027', 'REA028', 'REA029', 'REA030', 'REA031', 'REA032', 'REA033',
    'REA036', 'REA051', 'REA052', 'REA053', 'REA054', 'REA058', 'REA060',
    'REA061', 'REA062', 'REA063', 'REA064', 'REA065',
];

// ─── Known Thresholds ─────────────────────────────────────────────────────────
const itemThresholds = {
    'REA005': { critical: 5,    warning: 7,    unit: 'boxes'   },
    'REA006': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA007': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA008': { critical: 5,    warning: 7,    unit: 'boxes'   },
    'REA019': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA025': { critical: 2,    warning: 4,    unit: 'bottles' },
    'REA027': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA028': { critical: 15,   warning: 17,   unit: 'kits'    },
    'REA029': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA030': { critical: 15,   warning: 17,   unit: 'kits'    },
    'REA031': { critical: 15,   warning: 17,   unit: 'kits'    },
    'REA032': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA033': { critical: 15,   warning: 17,   unit: 'kits'    },
    'REA036': { critical: 2,    warning: 4,    unit: 'bottles' },
    'REA051': { critical: 1,    warning: 2,    unit: 'box'     },
    'REA052': { critical: 1,    warning: 2,    unit: 'box'     },
    'REA053': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA054': { critical: 10,   warning: 12,   unit: 'kits'    },
    'REA057': { critical: 0.25, warning: 0.50, unit: 'bottle'  },
    'REA058': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA060': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA061': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA062': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA063': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA064': { critical: 10,   warning: 20,   unit: 'units'   },
    'REA065': { critical: 10,   warning: 20,   unit: 'units'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getReagentThresholds = (itemCode) => {
    return itemThresholds[itemCode] ?? {
        critical: REAGENT_DEFAULT_CRITICAL_THRESHOLD,
        warning:  REAGENT_DEFAULT_WARNING_THRESHOLD,
        unit:     REAGENT_DEFAULT_UNIT,
    };
};

const getReagentStatus = (itemCode, stock) => {
    const { critical, warning } = getReagentThresholds(itemCode);
    if (stock <= 0)        return 'out-of-stock';
    if (stock <= critical) return 'critical';
    if (stock <= warning)  return 'warning';
    return 'normal';
};

// ─── Controller ───────────────────────────────────────────────────────────────
exports.getLabReagents = async (req, res) => {
    try {
        // Build placeholders: (?, ?, ?, ...) — one per tracked item code
        const placeholders = REAGENT_ITEM_CODES.map(() => '?').join(', ');

        const sql = `
            SELECT
                itemcode       AS itemCode,
                description,
                stocks_on_hand AS stock
            FROM inventory.reagents
            WHERE itemcode IN (${placeholders})
            ORDER BY itemcode ASC
        `;

        const [rows] = await database.mysqlPool.query(sql, REAGENT_ITEM_CODES);

        const enrichedData = rows.map(reagent => {
            const stock      = Number(reagent.stock);
            const thresholds = getReagentThresholds(reagent.itemCode);

            return {
                itemCode:    reagent.itemCode,
                description: reagent.description,
                stock,
                unit:        thresholds.unit,
                status:      getReagentStatus(reagent.itemCode, stock),
                thresholds,
            };
        });

        console.log(`📊 Total reagents fetched: ${enrichedData.length}`);

        return res.json({
            success:   true,
            count:     enrichedData.length,
            data:      enrichedData,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('❌ Lab Reagents Controller Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch laboratory reagents',
        });
    }
};