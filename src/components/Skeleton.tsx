// Componente de Skeleton Loading reutilizável

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5 animate-pulse">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-200 rounded-lg"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-6 sm:h-7 lg:h-8 bg-gray-200 rounded w-32 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-40"></div>
    </div>
  );
}

export function StatusCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-lg"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="text-right">
          <div className="h-6 sm:h-7 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      </div>
      <div className="pt-3 border-t border-gray-300">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow w-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
      </div>
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-6 py-4 animate-pulse">
            <div className="grid grid-cols-9 gap-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}






