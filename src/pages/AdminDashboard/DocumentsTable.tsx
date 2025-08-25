import React, { useState } from 'react';
import { FileText, Eye, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';

interface DocumentsTableProps {
  documents: Document[];
  onStatusUpdate: (documentId: string, status: Document['status']) => void;
  onViewDocument: (document: Document) => void;
}

export function DocumentsTable({ documents, onStatusUpdate, onViewDocument }: DocumentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 w-full">
        <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 border-b border-gray-200">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">All Documents</h3>
        </div>
        <div className="px-3 sm:px-4 lg:px-6 py-6 sm:py-8 text-center text-gray-500">
          <FileText className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-300" />
          <p className="text-sm sm:text-base font-medium">No documents in the system yet.</p>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Documents will appear here once users start uploading.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 w-full">
      {/* Header */}
      <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">All Documents</h3>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56 lg:w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 sm:pl-8 pr-2 py-1 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-xs w-full"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs w-full sm:w-auto"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-xs w-full sm:w-40 lg:w-48"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-[11px] sm:text-xs text-gray-500">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden lg:block border-t border-gray-200">
        <div className="relative">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-2 pl-3 pr-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Document
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Pages
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Cost
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th scope="col" className="pl-2 pr-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="py-2 pl-3 pr-2 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate max-w-xs" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate mt-0.5" title={doc.user_id}>
                        {doc.user_id}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                      {doc.pages}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc)}`}>
                        {getStatusIcon(doc)}
                        <span className="ml-1 capitalize">{doc.file_url ? 'Completed' : doc.status}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                      ${doc.total_cost}.00
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="pl-2 pr-3 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="text-tfe-blue-600 hover:text-tfe-blue-800 transition-colors p-1"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <select
                          value={doc.status || ''}
                          onChange={(e) => onStatusUpdate(doc.id, e.target.value as Document['status'])}
                          className="text-xs border border-gray-300 rounded px-2 py-1 max-w-[100px]"
                          aria-label="Update document status"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden border-t border-gray-200">
        <div className="divide-y divide-gray-200">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="p-2 sm:p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-gray-900 truncate" title={doc.filename}>
                        {doc.filename}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">
                        {doc.user_id}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-1 sm:gap-y-2 text-[11px] sm:text-xs text-gray-600">
                    <div className="truncate">
                      <span className="font-medium">Pages:</span> {doc.pages}
                    </div>
                    <div className="truncate">
                      <span className="font-medium">Cost:</span> ${doc.total_cost}.00
                    </div>
                    <div className="truncate">
                      <span className="font-medium">Date:</span> {new Date(doc.created_at || '').toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className={`ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(doc)}`}>
                        {getStatusIcon(doc)}
                        <span className="ml-0.5 capitalize truncate">{doc.file_url ? 'Completed' : doc.status}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end justify-between gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="text-tfe-blue-600 hover:text-tfe-blue-800 transition-colors p-0.5 sm:p-1"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={doc.status || ''}
                    onChange={(e) => onStatusUpdate(doc.id, e.target.value as Document['status'])}
                    className="text-[10px] sm:text-xs border border-gray-300 rounded px-1 py-0.5 max-w-[80px] sm:max-w-[90px] truncate"
                    aria-label="Update document status"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State for Filtered Results */}
      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="px-2 sm:px-4 lg:px-6 py-4 sm:py-6 text-center text-gray-500">
          <Search className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-300" />
          <p className="text-sm sm:text-base font-medium">No documents found</p>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
