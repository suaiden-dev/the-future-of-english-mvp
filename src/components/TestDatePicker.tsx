import React from 'react';
import { Calendar } from 'lucide-react';
import { DateRange } from './DateRangeFilter';

interface TestDatePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  className?: string;
}

export function TestDatePicker({ 
  dateRange, 
  onDateRangeChange, 
  className = '' 
}: TestDatePickerProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value ? new Date(e.target.value) : null;
    onDateRangeChange({
      ...dateRange,
      startDate,
      preset: 'custom'
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const endDate = e.target.value ? new Date(e.target.value) : null;
    onDateRangeChange({
      ...dateRange,
      endDate,
      preset: 'custom'
    });
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="w-4 h-4 text-gray-400" />
      <div className="flex items-center space-x-2">
        <input
          type="date"
          value={dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : ''}
          onChange={handleStartDateChange}
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Data início"
        />
        <span className="text-gray-500">até</span>
        <input
          type="date"
          value={dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : ''}
          onChange={handleEndDateChange}
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Data fim"
        />
      </div>
    </div>
  );
}
