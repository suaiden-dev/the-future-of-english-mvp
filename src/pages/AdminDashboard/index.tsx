import React, { useState, useEffect } from 'react';
import { StatsCards } from './StatsCards';
import { DocumentsTable } from './DocumentsTable';
import { DocumentsToAuthenticateTable } from './DocumentsToAuthenticateTable';
import { TranslatedDocumentsTable } from './TranslatedDocumentsTable';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { Document } from '../../App';
import { Home, FileText, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminDashboardProps {
  documents: Document[];
  onStatusUpdate: (documentId: string, status: Document['status']) => void;
}

export function AdminDashboard({ documents, onStatusUpdate }: AdminDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'to-authenticate' | 'translated'>('overview');

  // Detectar se o usuário veio de um link específico da sidebar
  useEffect(() => {
    const hash = location.hash;
    if (hash === '#to-authenticate') {
      setActiveTab('to-authenticate');
    } else if (hash === '#translated') {
      setActiveTab('translated');
    } else {
      // Se não há hash específico, vai para Overview (padrão)
      setActiveTab('overview');
    }
  }, [location.hash]);

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleCloseModal = () => {
    setSelectedDocument(null);
  };

  const handleTabChange = (tab: 'overview' | 'to-authenticate' | 'translated') => {
    setActiveTab(tab);
    // Atualizar a URL para refletir a aba ativa
    if (tab === 'overview') {
      navigate('/admin');
    } else {
      navigate(`/admin#${tab}`);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'to-authenticate', label: 'To Authenticate', icon: FileText },
    { id: 'translated', label: 'Translated', icon: CheckCircle },
  ];

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage translation projects and monitor business metrics</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      isActive
                        ? 'border-tfe-blue-500 text-tfe-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            <StatsCards documents={documents} />
            <div className="mt-8">
              <DocumentsTable 
                documents={documents}
                onStatusUpdate={onStatusUpdate}
                onViewDocument={handleViewDocument}
              />
            </div>
          </>
        )}

        {activeTab === 'to-authenticate' && (
          <div className="space-y-6">
            <DocumentsToAuthenticateTable />
          </div>
        )}

        {activeTab === 'translated' && (
          <div className="space-y-6">
            <TranslatedDocumentsTable />
          </div>
        )}

        <DocumentDetailsModal 
          document={selectedDocument}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}