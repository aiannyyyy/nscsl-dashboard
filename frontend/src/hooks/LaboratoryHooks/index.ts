// Export all Laboratory hooks from this folder

//useLaboratoryData hooks
export { 
    useLabTotalDailySamples,
    useReceivedSamples,
    useScreenedSamples,
    useCurrentMonthSamples
} from './useLaboratoryData';

//useCardSummary hooks
export {
    useCardSummary,
    useCurrentMonthSummary,
    useCustomRangeSummary
} from './useCardSummary';

//useYTDSampleComparison hooks
export {
    useYTDSampleComparison,
    useYTDChartData,
    useYTDBarChartData,
    useYTDTableData,
    useYTDSummaryStats,
    useYTDComparison
} from './useYTDSampleComparison';

// Export types
export type {
    YTDRawData,
    YTDFilters,
    YTDResponse,
    YTDChartData,
    YTDTableRow,
    YTDSummaryStats,
    UseYTDSampleComparisonParams,
    UseYTDComparisonResult
} from './useYTDSampleComparison';

export * from './useLabTrackingStats';

export { useLabSupplies } from './useLabSupplies';

export { useLabReagents } from './useLabReagents';

export { useCumulativeMonthlyCensus, useReceivedCensus } from './useCensus';

export { useCumulativeAnnualCensus } from './useCumulativeAnnualCencus';

// useDemogSummaryCards hooks
export {
    useDemogCurrentMonth,
    useDemogDateRange,
    useDemogMonth,
    useDemogYear,
    useDemogStats,
    useDemogTotals
} from './useDemogSummaryCards';

// Export types from useDemogSummaryCards
export type {
    DemogSummaryStats,
    DemogSummaryStatsWithDateRange,
    DateRangeParams
} from '../../services/LaboratoryServices/demogSummaryCardService';

export { useSpeedMonitoring } from './useSpeedMonitoring';

// Common Error Hooks
export {
    useCommonErrors, // Changed from useCommonError to useCommonErrors
    useCommonErrorBreakdown, // Add this new hook
    useCurrentMonthCommonErrors, // Changed from useCurrentMonthCommonError
    useCommonErrorStats,
    useCommonErrorBreakdownStats, // Add this new hook
    commonErrorKeys,
} from './useCommonError';

// Endorsement Hooks
export {
    useLookupLabNumber,
    useGetAllEndorsements,
    useGetEndorsementById,
    useGetEndorsementsByLabNo,
    useGetEndorsementsByFacility,
    useGetEndorsementsByStatus,
    useGetEndorsementStats,
    useCreateEndorsement,
    useUpdateEndorsement,
    useUpdateEndorsementStatus,
    useDeleteEndorsement,
    useUpdateEndorsementOptimistic,
    useDeleteEndorsementOptimistic,
    endorsementKeys,
    useGetUniqueTestResults
} from './useUnsatEndorsement';

// Export types from endorsement service
export type {
    EndorsementData,
    OracleLookupResponse,
    EndorsementStats,
    DateRange,
    StatusFilter,
} from '../../services/LaboratoryServices/unsatEndorsementService';

// Export helper function from endorsement service
export { createEndorsementFormData } from '../../services/LaboratoryServices/unsatEndorsementService';

// Logbook Endorsement Hooks
export {
    useLogbookEndorsementLookup,
    useLogbookEndorsement,
    useLogbookEndorsementList,
    useLogbookCategoryStats,
    useLogbookMnemonicStats,
    useCreateLogbookEndorsement,
    useUpdateLogbookEndorsement,
    logbookEndorsementKeys,
} from './useLogbookEndorsement';

// Export types from logbook endorsement service
export type {
    LogbookLookupTest,
    LogbookLookupPatient,
    LogbookLookupResponse,
    LogbookEndorsementRecord,
    CreateLogbookEndorsementPayload,
    UpdateLogbookEndorsementPayload,
    LogbookStatsItem,
} from '../../services/LaboratoryServices/logbookEndorsementServices';

