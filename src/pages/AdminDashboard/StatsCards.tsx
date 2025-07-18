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
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-900',
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
      bgColor: 'bg-red-100',
      iconColor: 'text-red-900',
      textColor: 'text-red-700'
    }
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
              </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statusStats.map((stat, index) => {
            const Icon = stat.icon;
            const percentage = documents.length > 0 ? (stat.value / documents.length) * 100 : 0;
            return (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{stat.title}</p>
                    <p className="text-xs text-gray-500">{stat.value} documents</p>
                  </div>
                </div>
                <div className="text-right">
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