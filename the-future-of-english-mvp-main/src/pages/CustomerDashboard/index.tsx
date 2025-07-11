import React, { useState } from 'react';
import { WelcomeSection } from './WelcomeSection';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentsList } from './DocumentsList';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { DocumentManager } from './DocumentManager';
import { User as UserType, Document, Folder } from '../../App';

interface CustomerDashboardProps {
  user: UserType | null;
  documents: Document[];
  folders: Folder[];
  onDocumentUpload: (document: Document) => void;
  onFolderCreate: (folder: Folder) => void;
  onFolderUpdate: (folderId: string, updates: Partial<Folder>) => void;
  onFolderDelete: (folderId: string) => void;
}

export function CustomerDashboard({ 
  user, 
  documents, 
  folders, 
  onDocumentUpload, 
  onFolderCreate, 
  onFolderUpdate, 
  onFolderDelete 
}: CustomerDashboardProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'documents'>('overview');

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleCloseDetailsModal = () => {
    setSelectedDocument(null);
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentView === 'overview' ? (
          <>
            <WelcomeSection user={user} onUploadClick={handleUploadClick} />
            <DocumentsList 
              documents={documents} 
              onViewDocument={handleViewDocument} 
            />
          </>
        ) : (
          <DocumentManager
            user={user}
            documents={documents}
            folders={folders}
            onDocumentUpload={onDocumentUpload}
            onFolderCreate={onFolderCreate}
            onFolderUpdate={onFolderUpdate}
            onFolderDelete={onFolderDelete}
            onViewDocument={handleViewDocument}
          />
        )}

        <DocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={handleCloseUploadModal}
          onUpload={onDocumentUpload}
          userId={user?.id || ''}
        />

        <DocumentDetailsModal
          document={selectedDocument}
          onClose={handleCloseDetailsModal}
        />
      </div>
    </div>
  );
}