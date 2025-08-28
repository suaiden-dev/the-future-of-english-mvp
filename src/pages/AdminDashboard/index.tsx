import { useState } from 'react';
import { StatsCards } from './StatsCards';
import { DocumentsTable } from './DocumentsTable';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { Document } from '../../App';

interface AdminDashboardProps {
  documents: Document[];
}

export function AdminDashboard({ documents }: AdminDashboardProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleCloseModal = () => {
    setSelectedDocument(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-3 sm:p-4 lg:p-6 w-full max-w-none">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mt-1 sm:mt-2">Manage translation projects and monitor business metrics</p>
        </div>

        {/* Main Content */}
        <div className="w-full">
          <div className="space-y-4 sm:space-y-6 w-full">
            <StatsCards documents={documents} />
            <DocumentsTable 
              documents={documents}
              onViewDocument={handleViewDocument}
            />
          </div>
        </div>
      </div>
      <DocumentDetailsModal 
        document={selectedDocument}
        onClose={handleCloseModal}
      />
    </div>
  );
}