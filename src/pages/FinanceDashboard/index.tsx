import React, { useState, useEffect } from 'react';
import { StatsCards } from './StatsCards';
import { PaymentsTable } from './PaymentsTable';
import AuthenticatorDocumentsTable from './AuthenticatorDocumentsTable';
import { ReportsTable } from './ReportsTable';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import { Document } from '../../App';
import { Home, CreditCard, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface FinanceDashboardProps {
  documents: Document[];
  onStatusUpdate: (documentId: string, status: 'pending' | 'processing' | 'completed') => void;
}

export function FinanceDashboard({ documents, onStatusUpdate }: FinanceDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'authenticator-docs' | 'reports'>('overview');

  // Detectar se o usuário veio de um link específico da sidebar
  useEffect(() => {
    const hash = location.hash;
    if (hash === '#payments') {
      setActiveTab('payments');
    } else if (hash === '#reports') {
      setActiveTab('reports');
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

  const handleTabChange = (tab: 'overview' | 'payments' | 'authenticator-docs' | 'reports') => {
    setActiveTab(tab);
    // Atualizar a URL para refletir a aba ativa
    if (tab === 'overview') {
      navigate('/finance');
    } else {
      navigate(`/finance#${tab}`);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'authenticator-docs', label: 'Authenticator Documents', icon: FileText },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="bg-gray-50">
      <div className="p-6 w-full max-w-none">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">Monitor payments, track translations, and generate business reports</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-tfe-blue-500 text-tfe-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'overview' && (
            <div className="space-y-6 w-full">
              <StatsCards documents={documents} />
              <PaymentsTable 
                documents={documents}
                onStatusUpdate={onStatusUpdate}
                onViewDocument={handleViewDocument}
              />
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6 w-full">
              <PaymentsTable 
                documents={documents}
                onStatusUpdate={onStatusUpdate}
                onViewDocument={handleViewDocument}
              />
            </div>
          )}

          {activeTab === 'authenticator-docs' && (
            <div className="space-y-6 w-full">
              <AuthenticatorDocumentsTable />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 w-full">
              <ReportsTable documents={documents} />
            </div>
          )}
        </div>
      </div>
      <DocumentDetailsModal 
        document={selectedDocument}
        onClose={handleCloseModal}
      />
    </div>
  );
}
