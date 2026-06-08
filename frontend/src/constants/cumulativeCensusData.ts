import type { CumulativeCensusDataItem } from '../services/LaboratoryServices/censusService';

/**
 * Monthly received sample counts per year (2013–2025).
 * Index 0 = January, Index 11 = December.
 * Use null for months with no recorded data.
 */
const HISTORICAL_MONTHLY: Record<number, (number | null)[]> = {
  2013: [null, null, null, null, null, null, null, null, null, null, null, null], // 2013 total shown but no monthly breakdown in image
  2014: [8654,  6995,  7445,  8546,  8996,  10300, 10612, 12965, 14231, 12577, 11485, null],
  2015: [12533, 9297,  10196, 10880, 11398, 13077, 15551, 13036, 17524, 17020, 15535, 16356],
  2016: [15658, 12272, 12393, 12651, 14711, 14689, 14243, 17383, 18556, 18519, 17834, 18349],
  2017: [15649, 12843, 14015, 13239, 15757, 17249, 17668, 20115, 20644, 21728, 22357, 19138],
  2018: [17807, 13750, 13545, 15550, 17027, 15525, 17990, 19167, 19741, 22893, 20710, 19426],
  2019: [19561, 14564, 15843, 17741, 18192, 16043, 18420, 17844, 20594, 20973, 18879, 18871],
  2020: [18243, 14310, 12001, 13860, 16539, 17166, 17730, 15625, 19748, 19461, 19082, 16032],
  2021: [12047, 10403, 12882, 11338, 12610, 14066, 13563, 15678, 17944, 17552, 16382, 14889],
  2022: [13437, 11488, 13465, 11624, 15431, 14797, 15010, 17078, 18609, 17051, 17800, 17044],
  2023: [16744, 13967, 15585, 13205, 16094, 15130, 15390, 17502, 18286, 18976, 19284, 17784],
  2024: [15731, 13678, 13045, 14620, 15292, 13715, 16802, 16199, 18260, 19811, 18005, 17144],
  2025: [16831, 13124, 13374, 14489, 15058, 15347, 16330, 15618, 19272, 19322, 16562, 17458],
};

/**
 * Flattened array of CumulativeCensusDataItem for all hardcoded years.
 * Months with null values are excluded from the array.
 */
export const HISTORICAL_CENSUS_DATA: CumulativeCensusDataItem[] = Object.entries(
  HISTORICAL_MONTHLY
).flatMap(([yearStr, months]) => {
  const year = Number(yearStr);
  return months
    .map((total, idx) => ({
      MONTH: idx + 1,
      YEAR: year,
      TOTAL_SAMPLES: total ?? 0,
    }))
    .filter((_, idx) => HISTORICAL_MONTHLY[year][idx] !== null);
});