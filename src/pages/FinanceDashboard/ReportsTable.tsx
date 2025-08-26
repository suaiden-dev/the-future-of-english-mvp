import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Calendar, FileText, TrendingUp, DollarSign, Users, BarChart3, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReportsTable() {
  const [reportType, setReportType] = useState('monthly');
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    console.log('📋 Carregando relatórios salvos...');
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao carregar relatórios:', error);
        throw error;
      }
      
      console.log('✅ Relatórios carregados:', data?.length || 0);
      
      // Processar dados dos relatórios para extrair informações do JSON parameters
      const processedReports = (data || []).map((report: any) => {
        let parameters: any = {};
        try {
          parameters = typeof report.parameters === 'string' 
            ? JSON.parse(report.parameters) 
            : (report.parameters || {});
        } catch (e) {
          console.warn('Erro ao parsear parameters do relatório:', e);
          parameters = {};
        }
        
        return {
          ...report,
          total_revenue: (parameters as any).total_revenue || 0,
          total_documents: (parameters as any).total_documents || 0,
          total_users: (parameters as any).total_users || 0,
          period_start: (parameters as any).start_date || report.created_at,
          period_end: (parameters as any).end_date || report.created_at,
          status: 'completed' // Assumir que relatórios salvos estão completos
        };
      });
      
      setReports(processedReports);
      
    } catch (error) {
      console.error('💥 Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    console.log('🚀 Iniciando geração de relatório...', { reportType, customStartDate, customEndDate });
    
    try {
      setGeneratingReport(true);
      
      let startDate = '';
      let endDate = '';
      
      // Definir datas baseadas no tipo de relatório
      const now = new Date();
      switch (reportType) {
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
          break;
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59).toISOString();
          break;
        case 'annual':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            alert('Por favor, selecione as datas de início e fim para o relatório personalizado');
            return;
          }
          startDate = new Date(customStartDate + 'T00:00:00').toISOString();
          endDate = new Date(customEndDate + 'T23:59:59').toISOString();
          break;
      }

      console.log('📅 Período do relatório:', { startDate, endDate });

      // Gerar relatório usando a nova função RPC abrangente
      console.log('🔄 Chamando generate_comprehensive_report...');
      const { data: reportData, error } = await supabase
        .rpc('generate_comprehensive_report', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_report_type: reportType
        });
      
      if (error) {
        console.error('❌ Erro na RPC:', error);
        throw error;
      }

      console.log('✅ Dados do relatório recebidos:', reportData);

      if (!reportData || reportData.error || !reportData.general_summary) {
        throw new Error('Dados do relatório inválidos ou vazios');
      }

      // Criar entrada na tabela de relatórios para histórico
      const reportRecord = {
        report_type: reportType,
        title: `Relatório ${reportType} - ${new Date().toLocaleDateString('pt-BR')}`,
        description: `Relatório gerado para o período de ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}. Receita total: $${reportData.general_summary?.total_revenue || 0}, Documentos: ${reportData.general_summary?.total_documents || 0}, Usuários: ${reportData.general_summary?.unique_users || 0}`,
        file_url: null, // Será preenchido quando implementarmos upload de arquivos
        generated_by: (await supabase.auth.getUser()).data.user?.id || null,
        parameters: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          report_type: reportType,
          total_revenue: reportData.general_summary?.total_revenue || 0,
          total_documents: reportData.general_summary?.total_documents || 0,
          total_users: reportData.general_summary?.unique_users || 0
        })
      };

      console.log('💾 Salvando registro do relatório:', reportRecord);
      
      const { data: savedReport, error: insertError } = await supabase
        .from('reports')
        .insert(reportRecord)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao salvar relatório:', insertError);
        throw insertError;
      }

      console.log('✅ Relatório salvo com ID:', savedReport?.id);

      // Recarregar relatórios
      await loadReports();
      
      // Download automático do relatório no formato selecionado
      const fileName = `report-${reportType}-${new Date().toISOString().split('T')[0]}`;
      downloadReportInFormat(reportData, fileName, exportFormat);
      
    } catch (error: any) {
      console.error('💥 Erro ao gerar relatório:', error);
      alert(`❌ Error generating report: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadComprehensiveReport = (reportData: any, filename: string) => {
    console.log('📥 Gerando download do relatório...', filename);
    
    if (!reportData || !reportData.general_summary) {
      alert('❌ Dados insuficientes para download');
      return;
    }

    try {
      // Criar CSV abrangente com todas as seções
      const csvSections: string[] = [];
      
      // 1. Metadados do relatório
      csvSections.push('=== RELATÓRIO DETALHADO DE PAGAMENTOS ===');
      csvSections.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
      csvSections.push(`Período: ${new Date(reportData.report_metadata.start_date).toLocaleDateString('pt-BR')} até ${new Date(reportData.report_metadata.end_date).toLocaleDateString('pt-BR')}`);
      csvSections.push(`Tipo: ${reportData.report_metadata.report_type}`);
      csvSections.push('');
      
      // 2. Resumo geral
      csvSections.push('=== RESUMO GERAL ===');
      csvSections.push(`Total de Pagamentos,${reportData.general_summary.total_payments}`);
      csvSections.push(`Receita Total,${reportData.general_summary.total_revenue}`);
      csvSections.push(`Usuários Únicos,${reportData.general_summary.unique_users}`);
      csvSections.push(`Total de Documentos,${reportData.general_summary.total_documents}`);
      csvSections.push(`Valor Médio por Pagamento,${reportData.general_summary.avg_payment_amount?.toFixed(2) || 0}`);
      csvSections.push(`Pagamentos de Usuários Regulares,${reportData.general_summary.regular_user_payments}`);
      csvSections.push(`Pagamentos de Autenticadores,${reportData.general_summary.authenticator_payments}`);
      csvSections.push(`Receita de Usuários Regulares,${reportData.general_summary.regular_user_revenue}`);
      csvSections.push(`Receita de Autenticadores,${reportData.general_summary.authenticator_revenue}`);
      csvSections.push('');

      // 3. Breakdown por tipo de usuário
      if (reportData.user_type_breakdown?.length > 0) {
        csvSections.push('=== BREAKDOWN POR TIPO DE USUÁRIO ===');
        csvSections.push('Tipo de Usuário,Pagamentos,Receita,Usuários Únicos,Pagamento Médio');
        reportData.user_type_breakdown.forEach((item: any) => {
          csvSections.push(`${item.user_type},${item.payment_count},${item.revenue},${item.unique_users},${item.avg_payment?.toFixed(2) || 0}`);
        });
        csvSections.push('');
      }

      // 4. Breakdown por tipo de tradução
      if (reportData.translation_type_breakdown?.length > 0) {
        csvSections.push('=== BREAKDOWN POR TIPO DE TRADUÇÃO ===');
        csvSections.push('Tipo de Tradução,Pagamentos,Receita,Usuários Únicos');
        reportData.translation_type_breakdown.forEach((item: any) => {
          csvSections.push(`${item.translation_type},${item.payment_count},${item.revenue},${item.unique_users}`);
        });
        csvSections.push('');
      }

      // 5. Breakdown por idioma
      if (reportData.language_breakdown?.length > 0) {
        csvSections.push('=== BREAKDOWN POR IDIOMA ===');
        csvSections.push('Idioma Origem,Idioma Destino,Pagamentos,Receita');
        reportData.language_breakdown.forEach((item: any) => {
          csvSections.push(`${item.source_language},${item.target_language},${item.payment_count},${item.revenue}`);
        });
        csvSections.push('');
      }

      // 6. Top usuários
      if (reportData.top_users?.length > 0) {
        csvSections.push('=== TOP USUÁRIOS POR RECEITA ===');
        csvSections.push('Email,Nome,Tipo,Total de Pagamentos,Total Receita,Pagamento Médio');
        reportData.top_users.forEach((user: any) => {
          csvSections.push(`${user.user_email || ''},${user.user_name || ''},${user.user_type},${user.total_payments},${user.total_revenue},${user.avg_payment?.toFixed(2) || 0}`);
        });
        csvSections.push('');
      }

      // 7. Performance mensal
      if (reportData.monthly_performance?.length > 0) {
        csvSections.push('=== PERFORMANCE MENSAL ===');
        csvSections.push('Mês,Pagamentos,Receita,Usuários Únicos');
        reportData.monthly_performance.forEach((month: any) => {
          csvSections.push(`${month.month},${month.payment_count},${month.revenue},${month.unique_users}`);
        });
        csvSections.push('');
      }

      // 8. Status dos documentos
      if (reportData.document_status_breakdown?.length > 0) {
        csvSections.push('=== STATUS DOS DOCUMENTOS ===');
        csvSections.push('Status,Pagamentos,Receita');
        reportData.document_status_breakdown.forEach((status: any) => {
          csvSections.push(`${status.document_status},${status.payment_count},${status.revenue}`);
        });
        csvSections.push('');
      }

      // 9. Pagamentos detalhados (incluir se solicitado)
      if (includeDetails && reportData.detailed_payments?.length > 0) {
        csvSections.push('=== PAGAMENTOS DETALHADOS ===');
        csvSections.push('ID Pagamento,Valor,Moeda,Status Pagamento,Data Pagamento,Nome Documento,Status Documento,Extrato Bancário,Tipo Tradução,Idioma Origem,Idioma Destino,Email,Nome Usuário,Tipo Usuário');
        reportData.detailed_payments.forEach((payment: any) => {
          csvSections.push([
            payment.payment_id || '',
            payment.amount || 0,
            payment.currency || 'USD',
            payment.payment_status || '',
            payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : '',
            `"${payment.document_name || ''}"`.replace(/"/g, '""'),
            payment.document_status || '',
            payment.is_bank_statement ? 'Sim' : 'Não',
            payment.translation_type || '',
            payment.source_language || '',
            payment.target_language || '',
            payment.user_email || '',
            `"${payment.user_name || ''}"`.replace(/"/g, '""'),
            payment.user_type || ''
          ].join(','));
        });
      }

      // Juntar todas as seções
      const csvContent = csvSections.join('\n');

      // Criar e fazer download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('✅ Download iniciado:', filename);
      
    } catch (error) {
      console.error('💥 Erro ao gerar download:', error);
      alert('❌ Erro ao gerar arquivo de download');
    }
  };

  const downloadReportInFormat = (reportData: any, fileName: string, format: string) => {
    if (!reportData || !reportData.general_summary) {
      alert('❌ Insufficient data for download');
      return;
    }

    try {
      switch (format) {
        case 'csv':
          downloadComprehensiveReport(reportData, `${fileName}.csv`);
          break;
        
        case 'json':
          downloadAsJSON(reportData, `${fileName}.json`);
          break;
        
        case 'excel':
          downloadAsExcel(reportData, `${fileName}.xlsx`);
          break;
        
        case 'pdf':
          downloadAsPDF(reportData, `${fileName}.pdf`);
          break;
        
        default:
          downloadComprehensiveReport(reportData, `${fileName}.csv`);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error generating download file');
    }
  };

  const downloadAsJSON = (reportData: any, fileName: string) => {
    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsExcel = (reportData: any, fileName: string) => {
    // For simplicity, we'll create a CSV that Excel can open
    // In a real implementation, you'd use a library like xlsx
    const csvContent = generateCSVFromData(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.xlsx', '.csv');
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsPDF = (reportData: any, fileName: string) => {
    const pdf = new jsPDF();
    
    // Title
    pdf.setFontSize(18);
    pdf.text('Financial Report', 20, 30);
    
    // Summary
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 50);
    pdf.text(`Period: ${new Date(reportData.report_metadata.start_date).toLocaleDateString()} - ${new Date(reportData.report_metadata.end_date).toLocaleDateString()}`, 20, 60);
    
    // Key metrics
    pdf.text('Summary:', 20, 80);
    pdf.text(`Total Revenue: $${reportData.general_summary.total_revenue}`, 20, 90);
    pdf.text(`Total Documents: ${reportData.general_summary.total_documents}`, 20, 100);
    pdf.text(`Total Users: ${reportData.general_summary.unique_users}`, 20, 110);
    
    pdf.save(fileName);
  };

  const generateCSVFromData = (reportData: any) => {
    const csvSections: string[] = [];
    
    csvSections.push('Financial Report');
    csvSections.push(`Generated: ${new Date().toLocaleDateString()}`);
    csvSections.push(`Period: ${new Date(reportData.report_metadata.start_date).toLocaleDateString()} - ${new Date(reportData.report_metadata.end_date).toLocaleDateString()}`);
    csvSections.push('');
    
    csvSections.push('Summary:');
    csvSections.push(`Total Revenue,$${reportData.general_summary.total_revenue}`);
    csvSections.push(`Total Documents,${reportData.general_summary.total_documents}`);
    csvSections.push(`Total Users,${reportData.general_summary.unique_users}`);
    
    return csvSections.join('\n');
  };

  const downloadExistingReport = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // Buscar dados do relatório usando a função abrangente
      const { data: reportData, error } = await supabase
        .rpc('generate_comprehensive_report', {
          p_start_date: report.period_start,
          p_end_date: report.period_end,
          p_report_type: report.report_type || 'custom'
        });
      
      if (error) throw error;

      if (reportData && reportData.general_summary) {
        // Usar a função downloadReportInFormat com formato padrão CSV
        const fileName = `${report.report_type || 'report'}-${report.id}-${new Date().toISOString().split('T')[0]}`;
        downloadReportInFormat(reportData, fileName, 'csv');
      } else {
        throw new Error('Invalid report data');
      }
      
    } catch (error) {
      console.error('Error downloading report:', error);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            
            <div className="flex items-end sm:col-span-1">
              <div className="w-full space-y-2">
                <div className="flex items-center">
                  <input
                    id="include-details"
                    name="include-details"
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    className="h-4 w-4 text-tfe-blue-600 focus:ring-tfe-blue-500 border-gray-300 rounded"
                  />
                                    <label htmlFor="include-details" className="ml-2 block text-sm text-gray-700">
                    Include details
                  </label>
                </div>
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="w-full px-4 py-2 bg-tfe-blue-600 text-white rounded-md hover:bg-tfe-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Report types explanation */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">📊 What the report includes:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                General payments and revenue summary
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Breakdown by regular users vs authenticators
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analysis by translation type and languages
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Top users and monthly performance
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Generated Reports</h3>
              <p className="text-sm text-gray-500">Download previously generated reports</p>
            </div>
            <button
              onClick={loadReports}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-tfe-blue-500 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Update
            </button>
          </div>
        </div>
        
        {/* Mobile: Cards View */}
        <div className="block sm:hidden">
          {reports.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No reports generated yet</p>
              <p className="text-sm text-gray-500">
                Use the form above to generate your first detailed report
              </p>
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
                          ${(report.total_revenue || 0).toFixed(2)}
                        </span>
                        <span className="flex items-center text-blue-600">
                          <FileText className="w-3 h-3 mr-1" />
                          {report.total_documents || 0}
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
                              ${(report.total_revenue || 0).toFixed(2)}
                            </span>
                            <span className="flex items-center">
                              <FileText className="w-4 h-4 mr-1 text-blue-600" />
                              {report.total_documents || 0}
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
