import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  FileText,
  User,
  Clock,
  ArrowLeft,
  X,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useActionLogs, ActionLog } from '../../hooks/useActionLogs';
import { ActionTypeLabels } from '../../types/actionTypes';

interface Client {
  id: string;
  name: string;
  email: string;
  total_logs: number;
  total_documents: number;
  last_activity: string | null;
}

export const ActionLogs: React.FC = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [documentIdFilter, setDocumentIdFilter] = useState('');

  const { 
    logs, 
    loading: logsLoading, 
    error: logsError,
    pagination,
    updateFilters,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
    fetchLogs
  } = useActionLogs(selectedClient?.id);

  // Fetch clients with statistics
  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get statistics for each user
      const clientsWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Count logs
          const { count: logsCount } = await supabase
            .from('action_logs')
            .select('*', { count: 'exact', head: true })
            .or(`affected_user_id.eq.${profile.id},performed_by.eq.${profile.id}`);

          // Count documents
          const { count: docsCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get last activity
          const { data: lastLog } = await supabase
            .from('action_logs')
            .select('created_at')
            .or(`affected_user_id.eq.${profile.id},performed_by.eq.${profile.id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            total_logs: logsCount || 0,
            total_documents: docsCount || 0,
            last_activity: lastLog?.created_at || null,
          };
        })
      );

      setClients(clientsWithStats);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    const filters: any = {};
    
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (documentIdFilter) filters.document_id = documentIdFilter;
    if (searchTerm) filters.search_term = searchTerm;

    updateFilters(filters);
  }, [dateFrom, dateTo, documentIdFilter, searchTerm, updateFilters]);

  // Quick date filters
  const applyQuickDateFilter = (preset: string) => {
    const now = new Date();
    let from = '';
    let to = '';

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
        to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();
        break;
      case 'last7days':
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        from = last7.toISOString();
        to = now.toISOString();
        break;
      case 'last30days':
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        from = last30.toISOString();
        to = now.toISOString();
        break;
      case 'all':
        from = '';
        to = '';
        break;
    }

    setDateFrom(from);
    setDateTo(to);
  };

  // Filter clients by search
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower)
    );
  });

  // If a client is selected, show their logs
  if (selectedClient) {
    return (
      <ClientLogsView
        client={selectedClient}
        logs={logs}
        loading={logsLoading}
        error={logsError}
        pagination={pagination}
        onBack={() => setSelectedClient(null)}
        onPageChange={goToPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        documentIdFilter={documentIdFilter}
        onDocumentIdFilterChange={setDocumentIdFilter}
        onQuickDateFilter={applyQuickDateFilter}
        onClearFilters={() => {
          clearFilters();
          setDateFrom('');
          setDateTo('');
          setDocumentIdFilter('');
          setSearchTerm('');
        }}
      />
    );
  }

  // Show clients list
  return (
    <div className="py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Action Logs</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm">View and analyze user activity logs</p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Clients List */}
        {clientsLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No clients found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-10 h-10 bg-tfe-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <User className="w-5 h-5 text-tfe-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Total Logs</div>
                        <div className="text-lg font-semibold text-gray-900">{client.total_logs}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Documents</div>
                        <div className="text-lg font-semibold text-gray-900">{client.total_documents}</div>
                      </div>
                      <div className="text-center min-w-[120px]">
                        <div className="text-sm text-gray-600">Last Activity</div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.last_activity
                            ? new Date(client.last_activity).toLocaleDateString()
                            : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Client Logs View Component
interface ClientLogsViewProps {
  client: Client;
  logs: ActionLog[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  onBack: () => void;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  documentIdFilter: string;
  onDocumentIdFilterChange: (id: string) => void;
  onQuickDateFilter: (preset: string) => void;
  onClearFilters: () => void;
}

const ClientLogsView: React.FC<ClientLogsViewProps> = ({
  client,
  logs,
  loading,
  error,
  pagination,
  onBack,
  onPageChange,
  onNextPage,
  onPrevPage,
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  documentIdFilter,
  onDocumentIdFilterChange,
  onQuickDateFilter,
  onClearFilters,
}) => {
  return (
    <div className="py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-tfe-blue-600 hover:text-tfe-blue-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clients
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Logs for {client.name}
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm">{client.email}</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-tfe-blue-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold">{client.total_documents}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Last Activity</p>
                <p className="text-lg font-semibold">
                  {client.last_activity
                    ? new Date(client.last_activity).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={onToggleFilters}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date From
                  </label>
                  <input
                    type="datetime-local"
                    value={dateFrom ? dateFrom.slice(0, 16) : ''}
                    onChange={(e) => onDateFromChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date To
                  </label>
                  <input
                    type="datetime-local"
                    value={dateTo ? dateTo.slice(0, 16) : ''}
                    onChange={(e) => onDateToChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document ID
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by document ID..."
                    value={documentIdFilter}
                    onChange={(e) => onDocumentIdFilterChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tfe-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quick Date Filters */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onQuickDateFilter('today')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => onQuickDateFilter('yesterday')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => onQuickDateFilter('last7days')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => onQuickDateFilter('last30days')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => onQuickDateFilter('all')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    All Time
                  </button>
                </div>
              </div>

              <button
                onClick={onClearFilters}
                className="flex items-center text-sm text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <p className="text-gray-600">No logs found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              {logs.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} logs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevPage}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={onNextPage}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Log Item Component
interface LogItemProps {
  log: ActionLog;
}

const LogItem: React.FC<LogItemProps> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const formatMetadata = (metadata: Record<string, any> | null): string => {
    if (!metadata) return 'No additional data';
    return JSON.stringify(metadata, null, 2);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900">
              {ActionTypeLabels[log.action_type] || log.action_type}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              log.performed_by_type === 'admin' ? 'bg-purple-100 text-purple-800' :
              log.performed_by_type === 'authenticator' ? 'bg-blue-100 text-blue-800' :
              log.performed_by_type === 'finance' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {log.performed_by_type}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{log.action_description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>By: {log.performed_by_name || log.performed_by_email || 'Unknown'}</span>
            <span>{new Date(log.created_at).toLocaleString()}</span>
            {log.entity_type && log.entity_id && (
              <span>
                {log.entity_type}: {log.entity_id.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
        {log.metadata && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-4 text-sm text-tfe-blue-600 hover:text-tfe-blue-700"
          >
            {expanded ? 'Hide' : 'Show'} Details
          </button>
        )}
      </div>
      {expanded && log.metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
            {formatMetadata(log.metadata)}
          </pre>
        </div>
      )}
    </div>
  );
};

