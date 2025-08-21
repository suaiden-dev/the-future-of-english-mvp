import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Calendar, FileText, TrendingUp, DollarSign, Users } from 'lucide-react';

interface Report {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_documents: number;
  total_users: number;
  created_at: string;
  status: string;
}

export function ReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'annual' | 'custom'>('monthly');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
      
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      let startDate = '';
      let endDate = '';
      
      // Definir datas baseadas no tipo de relatório
      const now = new Date();
      switch (reportType) {
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
          break;
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString();
          break;
        case 'annual':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          endDate = new Date(now.getFullYear(), 11, 31).toISOString();
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            alert('Please select custom start and end dates');
            return;
          }
          startDate = new Date(customStartDate).toISOString();
          endDate = new Date(customEndDate).toISOString();
          break;
      }

      // Gerar relatório usando a função RPC
      const { data, error } = await supabase
        .rpc('generate_payment_report', {
          start_date: startDate,
          end_date: endDate
        });
      
      if (error) throw error;

      // Criar entrada na tabela de relatórios
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          report_type: reportType,
          period_start: startDate,
          period_end: endDate,
          total_revenue: data.reduce((sum: number, item: any) => sum + (item.amount || 0), 0),
          total_documents: data.length,
          total_users: new Set(data.map((item: any) => item.user_id)).size,
          status: 'completed'
        });

      if (insertError) throw insertError;

      // Recarregar relatórios
      await loadReports();
      
      // Download automático do relatório
      downloadReport(data, `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`);
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to download');
      return;
    }

    const csvContent = [
      ['Document ID', 'User ID', 'Amount', 'Currency', 'Status', 'Payment Date', 'Created At'],
      ...data.map(item => [
        item.document_id || '',
        item.user_id || '',
        item.amount?.toString() || '0',
        item.currency || 'USD',
        item.status || '',
        item.payment_date || '',
        item.created_at || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExistingReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // Buscar dados do relatório
      const { data, error } = await supabase
        .rpc('generate_payment_report', {
          start_date: report.period_start,
          end_date: report.period_end
        });
      
      if (error) throw error;

      downloadReport(data, `${report.report_type}-report-${report.id}.csv`);
      
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      alert('Error downloading report. Please try again.');
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'monthly':
        return Calendar;
      case 'quarterly':
        return TrendingUp;
      case 'annual':
        return FileText;
      case 'custom':
        return Calendar;
      default:
        return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Report Generator */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Generate New Report</h3>
          <p className="text-sm text-gray-500">Create custom reports for payments and translations</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom Period</option>
              </select>
            </div>
            
            {reportType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end sm:col-span-1">
              <button
                onClick={generateReport}
                disabled={generatingReport}
                className="w-full px-4 py-2 bg-tfe-blue-600 text-white rounded-md hover:bg-tfe-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Generated Reports</h3>
          <p className="text-sm text-gray-500">Download previously generated reports</p>
        </div>
        
        {/* Mobile: Cards View */}
        <div className="block sm:hidden">
          {reports.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No reports generated yet
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {reports.map((report) => {
                const Icon = getReportTypeIcon(report.report_type);
                return (
                  <div key={report.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-lg bg-tfe-blue-100 flex items-center justify-center mr-3">
                          <Icon className="h-4 w-4 text-tfe-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {report.report_type} Report
                          </div>
                          <div className="text-xs text-gray-500">
                            {report.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-gray-500">Period:</span>
                        <div className="font-medium text-gray-900">
                          {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <div className="font-medium text-gray-900">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center text-green-600">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${report.total_revenue.toFixed(2)}
                        </span>
                        <span className="flex items-center text-blue-600">
                          <FileText className="w-3 h-3 mr-1" />
                          {report.total_documents}
                        </span>
                        <span className="flex items-center text-purple-600">
                          <Users className="w-3 h-3 mr-1" />
                          {report.total_users}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-300">
                      <button
                        onClick={() => downloadExistingReport(report.id)}
                        className="w-full text-tfe-blue-600 hover:text-tfe-blue-900 flex items-center justify-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download Report
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No reports generated yet
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const Icon = getReportTypeIcon(report.report_type);
                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-tfe-blue-100 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-tfe-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {report.report_type} Report
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(report.period_start).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          to {new Date(report.period_end).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                              ${report.total_revenue.toFixed(2)}
                            </span>
                            <span className="flex items-center">
                              <FileText className="w-4 h-4 mr-1 text-blue-600" />
                              {report.total_documents}
                            </span>
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1 text-purple-600" />
                              {report.total_users}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => downloadExistingReport(report.id)}
                          className="text-tfe-blue-600 hover:text-tfe-blue-900 flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
