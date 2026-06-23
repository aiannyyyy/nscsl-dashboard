interface DashboardHeaderProps {
  userName: string;
  error?: string | null;
}

export default function DashboardHeader({ userName, error }: DashboardHeaderProps) {
  return (
    <>
      <div>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back, {userName}! Here's what's happening with your files today.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </>
  );
}