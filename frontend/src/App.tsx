import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/login/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import { PDOOverview } from './pages/pdo/PDOOverview';
import { AdminOverview } from './pages/admin/AdminOverview';
import { LaboratoryOverview } from './pages/laboratory/LaboratoryOverview';
import { FollowupOverview } from './pages/followup/FollowupOverview';
import { ITJobOrderOverview } from './pages/it-job-order/ITJobOrderOverview';
import { SampleReceived } from './pages/pdo/SampleReceived';
import { SampleScreened } from './pages/pdo/SampleScreened';
import { Unsatisfactory } from './pages/pdo/Unsatisfactory';
import ListCar from './pages/pdo/ListCar';
import NSFPerformance from './pages/pdo/NSFPerformance';
import DemoAndUnsat from './pages/laboratory/DemoAndUnsat';
import AccountingOverview from './pages/admin/AccountingOverview';
import { ITJobOrderSummary } from './pages/it-job-order/ITJobOrderSummary';
import { PatientInformationSystemContainer } from './pages/laboratory/PatientInformationSystemContainer';
import { LaboratoryInventoryOverview } from './pages/laboratory/LaboratoryInventoryOverview';
import { LopezQuezonOverview } from './pages/pdo/LopezQuezonOverview';
import { EndorsementToFollowUp } from './pages/laboratory/EndorsementToFollowUp'
import { LogbookEndorsement } from './pages/followup/LogbookEndorsement'
import { CMSUrgent } from './pages/followup/CMSUrgent';
import { FollowUpPatientInformationSystem } from './pages/followup/FollowUpPatientInformationSystem';
import { NSFDatabase } from './pages/pdo/NSFDatabase';
import { Calendar } from './pages/pdo/Calendar';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      retry: 2, // Retry failed requests twice
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route - Login */}
            <Route path="/login" element={<Login />} />

            {/* Root redirects to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              {/* Redirect dashboard root to PDO */}
              <Route index element={<Navigate to="/dashboard/pdo" replace />} />

              {/* PDO Routes */}
              <Route path="pdo" element={<PDOOverview />} />
              <Route path="pdo/nsf-database" element={< NSFDatabase />} />
              <Route path="pdo/sample-received" element={<SampleReceived />} />
              <Route path="pdo/sample-screened" element={<SampleScreened />} />
              <Route path="pdo/unsatisfactory" element={<Unsatisfactory />} />
              <Route path="pdo/nsf-performance" element={<NSFPerformance />} />
              <Route path="pdo/list-of-car" element={<ListCar />} />
              <Route path="pdo/lopez-quezon" element={<LopezQuezonOverview />} />
              <Route path="pdo/calendar" element={<Calendar />} />

              {/* Admin Routes */}
              <Route path="admin" element={<AdminOverview />} />
              <Route path="admin/accounting" element={<AccountingOverview />} />
              <Route path="admin/supply" element={<div>Supply & Purchasing Page</div>} />

              {/* Laboratory Routes */}
              <Route path="laboratory" element={<LaboratoryOverview />} />
              <Route path="laboratory/demo-unsat" element={<DemoAndUnsat />} />
              <Route path="laboratory/inventory" element={<LaboratoryInventoryOverview />} />
              <Route path="laboratory/patient-information-system" element={<PatientInformationSystemContainer />} />
              <Route path="laboratory/endorsement-to-followup" element={<EndorsementToFollowUp />} />
 
              {/* Followup Routes */}
              <Route path="followup" element={<FollowupOverview />} />
              <Route path="followup/logbook-endorsement" element={<LogbookEndorsement />} />
              <Route path="followup/cms-urgent" element={ <CMSUrgent /> } />
              <Route path="followup/patient-information-system" element={<FollowUpPatientInformationSystem />} />

              {/* IT Job Order Routes */}
              <Route path="it-job-order" element={<ITJobOrderOverview />} />
              <Route path="it-job-order/summary" element={ <ITJobOrderSummary />} />
            </Route>

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>

      {/* React Query DevTools - only shows in development 
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      */}
    </QueryClientProvider>
  );
}

export default App;