import React from 'react';
import { FileText, CheckCircle, Clock, DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Document } from '../../App';

interface StatsCardsProps {
  documents: Document[];
}

export function StatsCards({ documents }: StatsCardsProps) {
  const totalRevenue = documents.reduce((sum, doc) => sum + doc.total_cost, 0);
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;
  const processingDocuments = documents.filter(doc => doc.status === 'processing').length;
  
  // Calcular métricas adicionais
  const uniqueUsers = new Set(documents.map(doc => doc.user_id)).size;
  const avgRevenuePerDoc = documents.length > 0 ? totalRevenue / documents.length : 0;
  const completionRate = documents.length > 0 ? (completedDocuments / documents.length) * 100 : 0;

  const stats = [
    {
      title: 'Total Documents',
      value: documents.length,
      subtitle: 'All time',
      icon: FileText,
      bgColor: 'bg-tfe-blue-100',
      iconColor: 'text-tfe-blue-950',
      trend: null
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      subtitle: `Avg: $${avgRevenuePerDoc.toFixed(0)}/doc`,
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      trend: 'up'
    },
    {
      title: 'Active Users',
      value: uniqueUsers,
      subtitle: 'Unique customers',
      icon: Users,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      trend: null
    },
    {
      title: 'Completion Rate',
      value: `${completionRate.toFixed(1)}%`,
      subtitle: `${completedDocuments}/${documents.length} completed`,
      icon: TrendingUp,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-900',
      trend: 'up'
    }
  ];

  const statusStats = [
    {
      title: 'Completed',
      value: completedDocuments,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      textColor: 'text-green-700'
    },
    {
      title: 'Processing',
      value: processingDocuments,
      icon: Clock,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-900',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Pending',
      value: pendingDocuments,
      icon: AlertCircle,
      bgColor: 'bg-tfe-red-100',
      iconColor: 'text-tfe-red-950',
      textColor: 'text-tfe-red-700'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8 w-full max-w-full overflow-hidden">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
            <div key={index} className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100 w-full min-w-0">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">{stat.title}</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mt-1 truncate">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100 w-full">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
          {statusStats.map((stat, index) => {
            const Icon = stat.icon;
            const percentage = documents.length > 0 ? (stat.value / documents.length) * 100 : 0;
            return (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50 w-full min-w-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{stat.title}</p>
                    <p className="text-xs text-gray-500 truncate">{stat.value} documents</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                  </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}