import React, { useState } from 'react';
import { WelcomeSection } from './WelcomeSection';
import { CustomerStatsCards } from './CustomerStatsCards';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentsList } from './DocumentsList';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { DocumentManager } from './DocumentManager';
import { User as UserType, Document, Folder } from '../../App';
import { Database } from '../../lib/database.types';
type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register' | 'documents';

type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];

interface CustomerDashboardProps {
  user: UserType | null;
  documents: Document[];
  folders: Folder[];
  onDocumentUpload: (document: Omit<DocumentInsert, 'user_id'>) => void;
  onFolderCreate: (folder: Omit<FolderInsert, 'user_id'>) => void;
  onFolderUpdate: (folderId: string, updates: Partial<Folder>) => void;
  onFolderDelete: (folderId: string) => void;
  onViewDocument: (document: Document) => void;
  onNavigate: (page: Page) => void;
}

export function CustomerDashboard({ 
  user, 
  documents, 
  folders, 
  onDocumentUpload, 
  onFolderCreate, 
  onFolderUpdate, 
  onFolderDelete,
  onViewDocument,
  onNavigate
}: CustomerDashboardProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'documents'>('overview');

  const hasCompletedDocuments = documents.some(doc => doc.status === 'completed');

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
            
            <CustomerStatsCards documents={documents} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <RecentActivity 
                  documents={documents} 
                  onViewDocument={handleViewDocument} 
                />
              </div>
              <div>
                <QuickActions 
                  onUploadClick={handleUploadClick}
                  onNavigate={onNavigate}
                  hasCompletedDocuments={hasCompletedDocuments}
                />
              </div>
            </div>
            
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