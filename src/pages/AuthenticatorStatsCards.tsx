import React from 'react';
import { CheckCircle, Clock, AlertTriangle, BarChart2, UserCheck } from 'lucide-react';

interface AuthenticatorStatsCardsProps {
  documentsToVerify: any[];
}

// Mock de documentos autenticados por este autenticador
const mockAuthenticatedDocs = [
  { date: new Date(), status: 'authenticated' },
  { date: new Date(), status: 'authenticated' },
  { date: new Date(Date.now() - 86400000), status: 'authenticated' }, // ontem
  { date: new Date(Date.now() - 2 * 86400000), status: 'authenticated' }, // anteontem
  { date: new Date(Date.now() - 3 * 86400000), status: 'authenticated' },
  { date: new Date(Date.now() - 3 * 86400000), status: 'authenticated' },
  { date: new Date(Date.now() - 5 * 86400000), status: 'authenticated' },
  // ...
];

function getLast7DaysLabels() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }));
  }
  return days;
}

function getDocsPerDay(docs: { date: Date }[]) {
  const today = new Date();
  const counts = Array(7).fill(0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    counts[i] = docs.filter(doc => {
      return doc.date.getDate() === d.getDate() && doc.date.getMonth() === d.getMonth() && doc.date.getFullYear() === d.getFullYear();
    }).length;
  }
  return counts;
}

export default function AuthenticatorStatsCards({ documentsToVerify }: AuthenticatorStatsCardsProps) {
  const today = new Date();
  const totalAuthenticated = mockAuthenticatedDocs.length;
  const authenticatedToday = mockAuthenticatedDocs.filter(doc => {
    const d = doc.date;
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
  const pending = documentsToVerify.length;
  // Pendentes há mais de 2 dias
  const pendingOver2Days = documentsToVerify.filter(doc => {
    const upload = doc.created_at ? new Date(doc.created_at) : null;
    if (!upload) return false;
    const diff = (today.getTime() - upload.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 2;
  }).length;
  // Tempo médio de autenticação (mock)
  const avgTime = '2h 15min';

  const stats = [
    {
      title: 'Autenticados por você',
      value: totalAuthenticated,
      icon: UserCheck,
      bgColor: 'bg-tfe-blue-100',
      iconColor: 'text-tfe-blue-950',
      description: 'Total autenticados por você'
    },
    {
      title: 'Pendentes para autenticar',
      value: pending,
      icon: Clock,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-900',
      description: 'Aguardando sua ação'
    },
    {
      title: 'Tempo médio',
      value: avgTime,
      icon: BarChart2,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      description: 'Seu tempo médio de autenticação'
    },
    {
      title: 'Autenticados hoje',
      value: authenticatedToday,
      icon: CheckCircle,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-900',
      description: 'Hoje por você'
    }
  ];

  // Gráfico de barras dos últimos 7 dias
  const labels = getLast7DaysLabels();
  const data = getDocsPerDay(mockAuthenticatedDocs);
  const max = Math.max(...data, 1);

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-center space-x-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-xs text-gray-400">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* Alerta de pendências antigas */}
      {pendingOver2Days > 0 && (
        <div className="flex items-center bg-tfe-red-50 border border-tfe-red-200 rounded-xl p-4 mb-2">
          <AlertTriangle className="w-6 h-6 text-tfe-red-500 mr-3" />
          <span className="text-tfe-red-700 font-semibold mr-2">Atenção:</span>
          <span className="text-tfe-red-600">{pendingOver2Days} documento(s) pendente(s) há mais de 2 dias!</span>
        </div>
      )}
      {/* Gráfico de barras de produtividade */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-tfe-blue-700" />Produtividade (últimos 7 dias)</h3>
        <div className="flex items-end space-x-3 h-32">
          {data.map((value, idx) => (
            <div key={idx} className="flex flex-col items-center justify-end h-full">
              <div
                className="w-7 rounded-t-md bg-tfe-blue-400 transition-all duration-300"
                style={{ height: `${(value / max) * 100}%`, minHeight: 8 }}
                title={`${value} autenticado(s)`}
              ></div>
              <span className="text-xs text-gray-500 mt-1">{labels[idx]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 