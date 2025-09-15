import React from 'react';
import { Filter } from 'lucide-react';
import { GoogleStyleDatePicker } from './GoogleStyleDatePicker';
import { DateRange } from './DateRangeFilter';

interface TranslatedDocumentsFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  totalDocuments: number;
  filteredDocuments: number;
}

export function TranslatedDocumentsFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  totalDocuments,
  filteredDocuments
}: TranslatedDocumentsFiltersProps) {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'authenticated', label: 'Authenticated' },
    { value: 'pending', label: 'Pending' }
  ];

  return (
    <div className="bg-white rounded-lg shadow w-full">
      {/* Cabeçalho */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Translated Documents</h3>
            <p className="text-sm text-gray-500">
              Showing {filteredDocuments} of {totalDocuments} documents
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {/* Search */}
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search by name, email, filename, client..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              aria-label="Search documents"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by document status"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Google Style Date Range Filter */}
          <GoogleStyleDatePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
