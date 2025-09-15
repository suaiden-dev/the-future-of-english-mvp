import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset?: string;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const presets = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 3 months', value: '3m' },
    { label: 'Last 6 months', value: '6m' },
    { label: 'This year', value: 'year' },
    { label: 'Custom period', value: 'custom' }
  ];

  const getPresetDates = (preset: string): DateRange => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case '7d':
        return {
          startDate: new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: now,
          preset
        };
      case '30d':
        return {
          startDate: new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now,
          preset
        };
      case '3m':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          endDate: now,
          preset
        };
      case '6m':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now,
          preset
        };
      case 'year':
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: now,
          preset
        };
      case 'all':
      default:
        return {
          startDate: null,
          endDate: null,
          preset
        };
    }
  };

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      onDateRangeChange({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        preset: 'custom'
      });
    } else {
      onDateRangeChange(getPresetDates(preset));
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newDate = value ? new Date(value) : null;
    onDateRangeChange({
      ...dateRange,
      [field]: newDate,
      preset: 'custom'
    });
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const getCurrentPresetLabel = (): string => {
    if (dateRange.preset && dateRange.preset !== 'custom') {
      return presets.find(p => p.value === dateRange.preset)?.label || 'Custom period';
    }
    if (dateRange.startDate || dateRange.endDate) {
      return 'Custom period';
    }
    return 'All Time';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filter Period</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Preset Selector */}
          <div className="flex-1">
            <select
              value={dateRange.preset || 'all'}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            {presets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          </div>

          {/* Custom Date Inputs */}
          {(dateRange.preset === 'custom' || (!dateRange.preset && (dateRange.startDate || dateRange.endDate))) && (
            <>
              <div className="flex-1">
                <input
                  type="date"
                  placeholder="Start date"
                  value={formatDateForInput(dateRange.startDate)}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  max={formatDateForInput(dateRange.endDate || new Date())}
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  placeholder="End date"
                  value={formatDateForInput(dateRange.endDate)}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={formatDateForInput(dateRange.startDate)}
                  max={formatDateForInput(new Date())}
                />
              </div>
            </>
          )}
        </div>

        {/* Current Selection Display */}
        {dateRange.startDate && dateRange.endDate && (
          <div className="bg-blue-50 rounded-md px-3 py-2 text-xs text-blue-700 border border-blue-200">
            Showing data from {dateRange.startDate.toLocaleDateString('en-US')} to {dateRange.endDate.toLocaleDateString('en-US')}
          </div>
        )}
      </div>
    </div>
  );
}
