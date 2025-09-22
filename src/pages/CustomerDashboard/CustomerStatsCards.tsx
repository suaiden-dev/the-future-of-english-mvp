import React from 'react';
import { FileText, Clock, CheckCircle, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Document } from '../../App';
import { useI18n } from '../../contexts/I18nContext';

interface CustomerStatsCardsProps {
  documents: Document[];
}

export function CustomerStatsCards({ documents }: CustomerStatsCardsProps) {
  const { t } = useI18n();
  
  const totalDocuments = documents.length;
  const totalPages = documents.reduce((sum, doc) => sum + (doc.pages || 0), 0);

  // Lógica de status considerando a origem (source) e status real
  const completedDocuments = documents.filter(doc => {
    if (doc.source === 'translated_documents') {
      return ['completed', 'finished'].includes((doc.status || '').toLowerCase());
    }
    return false;
  }).length;

  const inProgressDocuments = documents.filter(doc => {
    if (doc.source === 'documents_to_be_verified') {
      return ['processing', 'in_progress'].includes((doc.status || '').toLowerCase());
    }
    if (doc.source === 'documents') {
      return ['processing', 'in_progress'].includes((doc.status || '').toLowerCase());
    }
    return false;
  }).length;

  // Calculate this month's activity
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthDocuments = documents.filter(doc => {
    const docDate = doc.uploadDate ? new Date(doc.uploadDate) : null;
    return docDate && docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
  });

  const stats = [
    {
      title: t('dashboard.statistics.cards.totalDocuments'),
      value: totalDocuments || 0,
      icon: FileText,
      bgColor: 'bg-tfe-blue-100',
      iconColor: 'text-tfe-blue-950',
      description: `${totalPages || 0} ${t('dashboard.statistics.cards.descriptions.pagesTotal')}`
    },
    {
      title: t('dashboard.statistics.cards.inProgress'),
      value: inProgressDocuments || 0,
      icon: Clock,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-900',
      description: `${inProgressDocuments} ${t('dashboard.statistics.cards.descriptions.inProgressText')}`
    },
    {
      title: t('dashboard.statistics.cards.completed'),
      value: completedDocuments || 0,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      description: t('dashboard.statistics.cards.descriptions.readyDownload')
    },
    {
      title: t('dashboard.statistics.cards.thisMonth'),
      value: thisMonthDocuments.length || 0,
      icon: Calendar,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-900',
      description: t('dashboard.statistics.cards.descriptions.documentsUploaded')
    }
  ];

  if (totalDocuments === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 text-center">
        <FileText className="w-16 h-16 text-tfe-blue-300 mx-auto mb-4" />
        <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          {t('dashboard.statistics.welcome.title')}
        </h3>
        <p className="text-gray-600 mb-4 text-lg leading-relaxed">
          {t('dashboard.statistics.welcome.description')}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-3xl font-bold text-tfe-blue-950">$20</div>
            <div className="text-base font-medium text-gray-600">{t('dashboard.statistics.features.perPage')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-3xl font-bold text-green-900">24-48h</div>
            <div className="text-base font-medium text-gray-600">{t('dashboard.statistics.features.turnaround')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-3xl font-bold text-purple-900">USCIS</div>
            <div className="text-base font-medium text-gray-600">{t('dashboard.statistics.features.accepted')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-3xl font-bold text-tfe-red-950">Certified</div>
            <div className="text-base font-medium text-gray-600">{t('dashboard.statistics.features.translation')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{t('dashboard.statistics.title')}</h2>
        <p className="text-gray-600 text-lg">{t('dashboard.statistics.description')}</p>
      </div>
      
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-base font-medium text-gray-600">{stat.title}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">{stat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}