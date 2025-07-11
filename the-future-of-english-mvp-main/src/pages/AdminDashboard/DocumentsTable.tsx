import React from 'react';
import { FileText, Eye } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';

interface DocumentsTableProps {
  documents: Document[];
  onStatusUpdate: (documentId: string, status: Document['status']) => void;
  onViewDocument: (document: Document) => void;
}

export function DocumentsTable({ documents, onStatusUpdate, onViewDocument }: DocumentsTableProps) {
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Documents</h3>
        </div>
        <div className="px-6 py-8 text-center text-gray-500">
          No documents in the system yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">All Documents</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Upload Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">
                      {doc.filename}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {doc.userId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.pages}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                    {getStatusIcon(doc.status)}
                    <span className="ml-1 capitalize">{doc.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${doc.totalCost}.00
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(doc.uploadDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewDocument(doc)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <select
                      value={doc.status}
                      onChange={(e) => onStatusUpdate(doc.id, e.target.value as Document['status'])}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
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
  );
}