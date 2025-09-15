import React, { useState, useEffect } from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';
import { DateRange } from './DateRangeFilter';

interface CustomDateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  className?: string;
}

export function CustomDateRangePicker({ 
  dateRange, 
  onDateRangeChange, 
  className = '' 
}: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('all');

  // Atualizar datas temporárias quando o dateRange muda
  useEffect(() => {
    if (dateRange.startDate) {
      setTempStartDate(dateRange.startDate.toISOString().split('T')[0]);
    } else {
      setTempStartDate('');
    }
    
    if (dateRange.endDate) {
      setTempEndDate(dateRange.endDate.toISOString().split('T')[0]);
    } else {
      setTempEndDate('');
    }
    
    setSelectedPreset(dateRange.preset || 'all');
  }, [dateRange]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    
    if (preset === 'custom') {
      // Manter as datas atuais para edição personalizada
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newStartDate: Date | null = null;
    let newEndDate: Date | null = now;

    switch (preset) {
      case '7d':
        newStartDate = new Date(startOfToday);
        newStartDate.setDate(startOfToday.getDate() - 7);
        break;
      case '30d':
        newStartDate = new Date(startOfToday);
        newStartDate.setDate(startOfToday.getDate() - 30);
        break;
      case '3m':
        newStartDate = new Date(startOfToday);
        newStartDate.setMonth(startOfToday.getMonth() - 3);
        break;
      case '6m':
        newStartDate = new Date(startOfToday);
        newStartDate.setMonth(startOfToday.getMonth() - 6);
        break;
      case 'year':
        newStartDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        newStartDate = null;
        newEndDate = null;
        preset = 'all';
    }

    onDateRangeChange({
      startDate: newStartDate,
      endDate: newEndDate,
      preset
    });
  };

  const handleCustomDateApply = () => {
    const startDate = tempStartDate ? new Date(tempStartDate) : null;
    const endDate = tempEndDate ? new Date(tempEndDate) : null;

    // Validar datas
    if (startDate && endDate && startDate > endDate) {
      alert('A data de início deve ser anterior à data de fim');
      return;
    }

    onDateRangeChange({
      startDate,
      endDate,
      preset: 'custom'
    });
    
    setIsOpen(false);
  };

  const handleClearDates = () => {
    setTempStartDate('');
    setTempEndDate('');
    onDateRangeChange({
      startDate: null,
      endDate: null,
      preset: 'all'
    });
    setSelectedPreset('all');
  };

  const formatDateRange = () => {
    if (dateRange.preset === 'custom') {
      if (dateRange.startDate && dateRange.endDate) {
        return `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
      } else if (dateRange.startDate) {
        return `Desde ${dateRange.startDate.toLocaleDateString()}`;
      } else if (dateRange.endDate) {
        return `Até ${dateRange.endDate.toLocaleDateString()}`;
      }
    }
    
    const presetLabels: { [key: string]: string } = {
      'all': 'Todos os períodos',
      '7d': 'Últimos 7 dias',
      '30d': 'Últimos 30 dias',
      '3m': 'Últimos 3 meses',
      '6m': 'Últimos 6 meses',
      'year': 'Este ano'
    };
    
    return presetLabels[selectedPreset] || 'Selecionar período';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white hover:bg-gray-50 min-w-[200px]"
        aria-label="Selecionar período"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-left truncate">{formatDateRange()}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Filtrar por período</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Períodos rápidos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: '7d', label: '7 dias' },
                  { value: '30d', label: '30 dias' },
                  { value: '3m', label: '3 meses' },
                  { value: '6m', label: '6 meses' },
                  { value: 'year', label: 'Este ano' }
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetChange(preset.value)}
                    className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Período personalizado
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Data de início
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    max={tempEndDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Data de fim
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={tempStartDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <button
                onClick={handleClearDates}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Limpar filtros
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCustomDateApply}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar o dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
