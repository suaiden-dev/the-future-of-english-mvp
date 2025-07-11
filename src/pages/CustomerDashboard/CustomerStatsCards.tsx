import React from 'react';
import { FileText, Clock, CheckCircle, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Document } from '../../App';

interface CustomerStatsCardsProps {
  documents: Document[];
}

export function CustomerStatsCards({ documents }: CustomerStatsCardsProps) {
  const totalDocuments = documents.length;
  const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;
  const processingDocuments = documents.filter(doc => doc.status === 'processing').length;
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const totalSpent = documents.reduce((sum, doc) => sum + doc.totalCost, 0);
  const totalPages = documents.reduce((sum, doc) => sum + doc.pages, 0);

  // Calculate this month's activity
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthDocuments = documents.filter(doc => {
    const docDate = new Date(doc.uploadDate);
    return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
  });

  const stats = [
    {
      title: 'Total Documents',
      value: totalDocuments,
      icon: FileText,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-900',
      description: `${totalPages} pages total`
    },
    {
      title: 'In Progress',
      value: pendingDocuments + processingDocuments,
      icon: Clock,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-900',
      description: `${pendingDocuments} pending, ${processingDocuments} processing`
    },
    {
      title: 'Completed',
      value: completedDocuments,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      description: 'Ready for download'
    },
    {
      title: 'Total Spent',
      value: `$${totalSpent}`,
      icon: DollarSign,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      description: `$${totalSpent / totalDocuments || 0} avg per document`
    },
    {
      title: 'This Month',
      value: thisMonthDocuments.length,
      icon: Calendar,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-900',
      description: 'Documents uploaded'
    },
    {
      title: 'Success Rate',
      value: totalDocuments > 0 ? `${Math.round((completedDocuments / totalDocuments) * 100)}%` : '0%',
      icon: TrendingUp,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-900',
      description: 'Completion rate'
    }
  ];

  if (totalDocuments === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 text-center">
        <FileText className="w-16 h-16 text-blue-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to Your Dashboard!
        </h3>
        <p className="text-gray-600 mb-4">
          Upload your first document to start tracking your translation progress and statistics.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">$20</div>
            <div className="text-sm text-gray-600">Per page</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-900">24-48h</div>
            <div className="text-sm text-gray-600">Turnaround</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">USCIS</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-900">Certified</div>
            <div className="text-sm text-gray-600">Translation</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Statistics</h2>
        <p className="text-gray-600">Overview of your document translation activity</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}