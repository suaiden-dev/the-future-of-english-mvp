import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, ChevronDown, ChevronUp, Eye, User, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuthenticatorActivity {
  id: string;
  authenticator_id: string;
  authenticator_name: string;
  authenticator_email: string;
  document_id: string;
  document_name: string;
  action: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  notes?: string;
}

interface Authenticator {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string | null;
  last_activity?: string;
  documents_processed: number;
  documents_pending: number;
}

export function AuthenticatorControl() {
  const [authenticators, setAuthenticators] = useState<Authenticator[]>([]);
  const [activities, setActivities] = useState<AuthenticatorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAuthenticator, setSelectedAuthenticator] = useState<string | null>(null);

  // Buscar autenticadores
  const fetchAuthenticators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'authenticator')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar estatísticas de documentos para cada autenticador
      const authenticatorsWithStats = await Promise.all(
        (data || []).map(async (auth) => {
          // Buscar documentos autenticados por este autenticador
          const { count: processedVerified } = await supabase
            .from('documents_to_be_verified')
            .select('*', { count: 'exact', head: true })
            .eq('authenticated_by', auth.id)
            .eq('is_authenticated', true);

          const { count: pendingVerified } = await supabase
            .from('documents_to_be_verified')
            .select('*', { count: 'exact', head: true })
            .eq('authenticated_by', auth.id)
            .eq('is_authenticated', false);

          // Buscar documentos traduzidos autenticados por este autenticador
          const { count: processedTranslated } = await supabase
            .from('translated_documents')
            .select('*', { count: 'exact', head: true })
            .eq('authenticated_by', auth.id)
            .eq('is_authenticated', true);

          const { count: pendingTranslated } = await supabase
            .from('translated_documents')
            .select('*', { count: 'exact', head: true })
            .eq('authenticated_by', auth.id)
            .eq('is_authenticated', false);

          return {
            ...auth,
            documents_processed: (processedVerified || 0) + (processedTranslated || 0),
            documents_pending: (pendingVerified || 0) + (pendingTranslated || 0),
          };
        })
      );

      setAuthenticators(authenticatorsWithStats);
      console.log('DEBUG: Authenticators encontrados:', authenticatorsWithStats);
    } catch (err) {
      console.error('Error fetching authenticators:', err);
      setError('Failed to fetch authenticators');
    }
  };

  // Buscar atividades dos autenticadores
  const fetchActivities = async () => {
    try {
      // Buscar documentos que foram autenticados
      const { data: verifiedDocs, error: verifiedError } = await supabase
        .from('documents_to_be_verified')
        .select(`
          id,
          filename,
          status,
          created_at,
          updated_at,
          authenticated_by,
          authenticated_by_name,
          authenticated_by_email,
          authentication_date,
          is_authenticated
        `)
        .not('authenticated_by', 'is', null)
        .order('updated_at', { ascending: false });

      if (verifiedError) throw verifiedError;

      // Buscar documentos traduzidos que foram autenticados
      const { data: translatedDocs, error: translatedError } = await supabase
        .from('translated_documents')
        .select(`
          id,
          filename,
          status,
          created_at,
          updated_at,
          authenticated_by,
          authenticated_by_name,
          authenticated_by_email,
          authentication_date,
          is_authenticated
        `)
        .not('authenticated_by', 'is', null)
        .order('updated_at', { ascending: false });

      if (translatedError) throw translatedError;

      // Combinar dados de ambas as tabelas
      const verifiedActivities = (verifiedDocs || []).map(doc => ({
        id: doc.id,
        authenticator_id: doc.authenticated_by || 'unknown',
        authenticator_name: doc.authenticated_by_name || 'Unknown',
        authenticator_email: doc.authenticated_by_email || 'Unknown',
        document_id: doc.id,
        document_name: doc.filename,
        action: 'Document Authentication',
        status: doc.is_authenticated ? 'completed' : 'pending',
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));

      const translatedActivities = (translatedDocs || []).map(doc => ({
        id: doc.id,
        authenticator_id: doc.authenticated_by || 'unknown',
        authenticator_name: doc.authenticated_by_name || 'Unknown',
        authenticator_email: doc.authenticated_by_email || 'Unknown',
        document_id: doc.id,
        document_name: doc.filename,
        action: 'Translation Authentication',
        status: doc.is_authenticated ? 'completed' : 'pending',
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));

      // Combinar e ordenar por data mais recente
      const allActivities = [...verifiedActivities, ...translatedActivities]
        .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime());

      setActivities(allActivities);
      console.log('DEBUG: Atividades encontradas:', allActivities);
      console.log('DEBUG: Documentos verificados:', verifiedDocs?.length || 0);
      console.log('DEBUG: Documentos traduzidos:', translatedDocs?.length || 0);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to fetch activities');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAuthenticators(), fetchActivities()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filtrar atividades
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.authenticator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.document_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesAuthenticator = !selectedAuthenticator || activity.authenticator_id === selectedAuthenticator;
    return matchesSearch && matchesStatus && matchesAuthenticator;
  });

  // Estatísticas
  const totalAuthenticators = authenticators.length;
  const activeAuthenticators = authenticators.filter(auth => auth.documents_pending > 0).length;
  const totalDocumentsProcessed = authenticators.reduce((sum, auth) => sum + auth.documents_processed, 0);
  const totalDocumentsPending = authenticators.reduce((sum, auth) => sum + auth.documents_pending, 0);

  const getStatusColor = (activity: AuthenticatorActivity) => {
    // Se tem file_url, significa que foi traduzido e está disponível para download/view
    if (activity.status === 'completed') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    // Caso contrário, usar o status original
    switch (activity.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-tfe-red-100 text-tfe-red-800 border-tfe-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TFE</span>
                  </div>
                  <h3 className="text-xl font-bold">The Future of English</h3>
                </div>
              </div>
              <p className="text-gray-600 mt-4">Loading authenticator data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Authenticator Control</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Monitor and control authenticator activities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Authenticators</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{totalAuthenticators}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-tfe-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-tfe-blue-950" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Active Authenticators</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{activeAuthenticators}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-900" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Documents Processed</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{totalDocumentsProcessed}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-900" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Pending Documents</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{totalDocumentsPending}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Authenticators List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Authenticators Overview</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Authenticator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents Processed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {authenticators.map((auth) => (
                  <tr key={auth.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {auth.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{auth.name}</div>
                          <div className="text-sm text-gray-500">{auth.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        auth.documents_pending > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {auth.documents_pending > 0 ? 'Active' : 'Idle'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {auth.documents_processed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {auth.documents_pending}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(auth.created_at || '').toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activities Monitor */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Activity Monitor</h3>
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm w-full sm:w-64"
                  />
                </div>
                
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
                    aria-label="Filter by status"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <select
                    value={selectedAuthenticator || ''}
                    onChange={(e) => setSelectedAuthenticator(e.target.value || null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
                    aria-label="Filter by authenticator"
                  >
                    <option value="">All Authenticators</option>
                    {authenticators.map((auth) => (
                      <option key={auth.id} value={auth.id}>{auth.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredActivities.length} of {activities.length} activities
            </p>
          </div>

          {/* Activities Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Authenticator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {activity.authenticator_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{activity.authenticator_name}</div>
                          <div className="text-sm text-gray-500">{activity.authenticator_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 truncate max-w-32" title={activity.document_name}>
                          {activity.document_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(activity)}`}>
                        {getStatusIcon(activity.status)}
                        <span className="ml-1 capitalize">{activity.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.updated_at ? new Date(activity.updated_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                        title="View details"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredActivities.length === 0 && activities.length > 0 && (
            <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No activities found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}

          {activities.length === 0 && (
            <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No authenticator activities yet.</p>
              <p className="text-sm text-gray-400 mt-1">Activities will appear here once authenticators start working.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 