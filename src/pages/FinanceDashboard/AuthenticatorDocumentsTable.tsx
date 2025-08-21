import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Download, Receipt, Calendar } from 'lucide-react';
import { DateRange } from '../../components/DateRangeFilter';

interface AuthenticatorDocument {
  id: string;
  filename: string;
  total_cost: number;
  created_at: string;
  source_language: string;
  target_language: string;
  translated_file_url: string;
  payment_method: string;
  authenticated_by_profile: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  user_profile: {
    name: string;
    email: string;
  };
  original_doc: {
    payment_method: string;
    receipt_url?: string;
  };
  authenticator_name: string;
  authenticator_email: string;
  client_name: string;
}

interface AuthenticatorDocumentsTableProps {
  dateRange?: DateRange;
}

export default function AuthenticatorDocumentsTable({ dateRange }: AuthenticatorDocumentsTableProps) {
  const [documents, setDocuments] = useState<AuthenticatorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [localDateRange, setLocalDateRange] = useState<DateRange>(dateRange || {
    startDate: null,
    endDate: null,
    preset: 'all'
  });

  useEffect(() => {
    loadDocuments();
  }, [localDateRange]);

  const handleDateRangeChange = (preset: string) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let newDateRange: DateRange;
    
    switch (preset) {
      case '7d':
        newDateRange = {
          startDate: new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: now,
          preset
        };
        break;
      case '30d':
        newDateRange = {
          startDate: new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now,
          preset
        };
        break;
      case '3m':
        newDateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          endDate: now,
          preset
        };
        break;
      case '6m':
        newDateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now,
          preset
        };
        break;
      case 'year':
        newDateRange = {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: now,
          preset
        };
        break;
      case 'all':
      default:
        newDateRange = {
          startDate: null,
          endDate: null,
          preset: 'all'
        };
    }
    
    setLocalDateRange(newDateRange);
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Carregando documentos dos authenticators...', { localDateRange });
      
      // Buscar documentos traduzidos primeiro
      let translatedQuery = supabase
        .from('translated_documents')
        .select(`
          id,
          filename,
          total_cost,
          created_at,
          source_language,
          target_language,
          translated_file_url,
          user_id,
          original_document_id
        `);

      // Aplicar filtros de data se existirem
      if (dateRange?.startDate) {
        translatedQuery = translatedQuery.gte('created_at', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        translatedQuery = translatedQuery.lte('created_at', dateRange.endDate.toISOString());
      }

      const { data: translatedDocs, error: translatedError } = await translatedQuery.order('created_at', { ascending: false });

      if (translatedError) {
        console.error('❌ Erro ao carregar documentos traduzidos:', translatedError);
        throw translatedError;
      }

      if (!translatedDocs || translatedDocs.length === 0) {
        console.log('📋 Nenhum documento traduzido encontrado');
        setDocuments([]);
        return;
      }

      console.log('📊 Documentos traduzidos encontrados:', translatedDocs.length);

      // Para cada documento traduzido, buscar informações adicionais
      const documentPromises = translatedDocs.map(async (doc: any) => {
        try {
          // Buscar dados do cliente (user_profile)
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', doc.user_id)
            .single();

          // Buscar dados do documento original
          const { data: originalDoc } = await supabase
            .from('documents_to_be_verified')
            .select('user_id, source_language, target_language, total_cost')
            .eq('id', doc.original_document_id)
            .single();

          if (!originalDoc) {
            return null; // Skip se não encontrar documento original
          }

          // Buscar dados do uploader (user_id do documento original)
          const { data: uploaderProfile } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', originalDoc.user_id)
            .single();

          // Verificar se é um upload de authenticator
          // (se o user_id do documento original tem role authenticator)
          if (!uploaderProfile || uploaderProfile.role !== 'authenticator') {
            return null; // Skip se não for upload de authenticator
          }

          // Buscar payment_method na tabela documents (onde authenticators salvam)
          const { data: documentsInfo } = await supabase
            .from('documents')
            .select('payment_method, receipt_url')
            .eq('user_id', originalDoc.user_id)
            .eq('filename', doc.filename)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          console.log(`📋 Payment info para ${doc.filename}:`, documentsInfo);

          return {
            ...doc,
            user_profile: userProfile,
            original_document: originalDoc,
            uploader_profile: uploaderProfile,
            documents_info: documentsInfo
          };
        } catch (err) {
          console.log(`⚠️ Erro ao processar documento ${doc.filename}:`, err);
          return null;
        }
      });

      // Aguardar todas as promises e filtrar nulls
      const documentsWithData = (await Promise.all(documentPromises)).filter(Boolean);
      
      console.log('📊 Documentos de authenticators filtrados:', documentsWithData.length);

      // Mapear os dados para a interface AuthenticatorDocument
      const mappedDocuments: AuthenticatorDocument[] = documentsWithData.map((doc: any) => ({
        id: doc.id,
        filename: doc.filename,
        total_cost: doc.total_cost || 0,
        created_at: doc.created_at,
        source_language: doc.source_language || 'Not specified',
        target_language: doc.target_language || 'English',
        translated_file_url: doc.translated_file_url,
        payment_method: doc.documents_info?.payment_method || 'N/A',
        authenticated_by_profile: {
          id: doc.uploader_profile?.id,
          name: doc.uploader_profile?.name,
          email: doc.uploader_profile?.email,
          role: doc.uploader_profile?.role
        },
        user_profile: {
          name: doc.user_profile?.name,
          email: doc.user_profile?.email
        },
        original_doc: {
          payment_method: doc.documents_info?.payment_method || 'N/A',
          receipt_url: doc.documents_info?.receipt_url
        },
        authenticator_name: doc.uploader_profile?.name,
        authenticator_email: doc.uploader_profile?.email,
        client_name: doc.user_profile?.name
      }));
      
      console.log('✅ Documentos mapeados:', mappedDocuments);
      
      setDocuments(mappedDocuments);
      
    } catch (error) {
      console.error('💥 Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Filtrar documentos válidos primeiro
    if (!doc || !doc.client_name || !doc.filename || !doc.authenticator_name) {
      return false;
    }
    
    const matchesSearch = searchTerm === '' || 
      doc.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.authenticator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.authenticator_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const downloadDocument = async (fileUrl: string, filename: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
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
    <div className="bg-white rounded-lg shadow w-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Authenticator Documents</h3>
            <p className="text-sm text-gray-500">Track documents uploaded directly by authenticators (not client documents approved by them)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by client name, filename, or authenticator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500"
            />
          </div>

          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={localDateRange?.preset || 'all'}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="year">This year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client/Document
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Authenticator
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Translation Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {loading ? 'Loading documents...' : 'No documents found'}
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {doc.client_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {doc.filename}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {doc.authenticator_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {doc.authenticator_email}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      From: {doc.source_language}
                    </div>
                    <div className="text-sm text-gray-500">
                      To: {doc.target_language}
                    </div>
                    <div className="text-xs text-tfe-blue-600 mt-1">
                      ✓ Authenticated
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {doc.original_doc?.payment_method ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {doc.original_doc.payment_method === 'card' ? '💳 Credit Card' : 
                           doc.original_doc.payment_method === 'bank_transfer' ? '🏦 Bank Transfer' :
                           doc.original_doc.payment_method === 'paypal' ? '📱 PayPal' :
                           doc.original_doc.payment_method}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${doc.total_cost.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {doc.translated_file_url && (
                        <>
                          <button
                            onClick={() => {
                              // Verificar se é uma URL completa ou um caminho do storage
                              const fileUrl = doc.translated_file_url.startsWith('http') 
                                ? doc.translated_file_url 
                                : supabase.storage
                                    .from('translated_documents')
                                    .getPublicUrl(doc.translated_file_url)
                                    .data.publicUrl;
                              downloadDocument(fileUrl, doc.filename);
                            }}
                            className="text-tfe-blue-600 hover:text-tfe-blue-900"
                            title="Download translated document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Verificar se é uma URL completa ou um caminho do storage
                              const fileUrl = doc.translated_file_url.startsWith('http') 
                                ? doc.translated_file_url 
                                : supabase.storage
                                    .from('translated_documents')
                                    .getPublicUrl(doc.translated_file_url)
                                    .data.publicUrl;
                              window.open(fileUrl, '_blank');
                            }}
                            className="text-tfe-blue-600 hover:text-tfe-blue-900"
                            title="View translated document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {doc.original_doc?.receipt_url && (
                        <button
                          onClick={() => {
                            // Verificar se é uma URL completa ou um caminho do storage
                            const receiptUrl = doc.original_doc?.receipt_url?.startsWith('http') 
                              ? doc.original_doc.receipt_url 
                              : supabase.storage
                                  .from('documents')
                                  .getPublicUrl(doc.original_doc?.receipt_url || '')
                                  .data.publicUrl;
                            window.open(receiptUrl, '_blank');
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="View receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredDocuments.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Showing {filteredDocuments.length} of {documents.length} documents</span>
            <span>Total: ${filteredDocuments.reduce((sum, doc) => sum + doc.total_cost, 0).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
