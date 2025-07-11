import React from 'react';
import { FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Document } from '../../App';

interface StatsCardsProps {
  documents: Document[];
}

export function StatsCards({ documents }: StatsCardsProps) {
  const totalRevenue = documents.reduce((sum, doc) => sum + doc.totalCost, 0);
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;

  const stats = [
    {
      title: 'Total Documents',
      value: documents.length,
      icon: FileText,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-900'
    },
    {
      title: 'Completed',
      value: completedDocuments,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900'
    },
    {
      title: 'Pending',
      value: pendingDocuments,
      icon: Clock,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-900'
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue}`,
      icon: DollarSign,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-900'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}