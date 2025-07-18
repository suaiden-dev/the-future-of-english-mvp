import React, { useState } from 'react';
import { StatsCards } from './StatsCards';
import { DocumentsTable } from './DocumentsTable';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { Document } from '../../App';

interface AdminDashboardProps {
  documents: Document[];
  onStatusUpdate: (documentId: string, status: Document['status']) => void;
}

export function AdminDashboard({ documents, onStatusUpdate }: AdminDashboardProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleCloseModal = () => {
    setSelectedDocument(null);
  };

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage translation projects and monitor business metrics</p>
        </div>

        <StatsCards documents={documents} />

        <DocumentsTable 
          documents={documents}
          onStatusUpdate={onStatusUpdate}
          onViewDocument={handleViewDocument}
        />

        <DocumentDetailsModal 
          document={selectedDocument}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}