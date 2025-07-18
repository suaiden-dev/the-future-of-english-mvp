import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Activity,
  Award,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { NotificationBell } from '../../components/NotificationBell';
import { useOverview } from '../../contexts/OverviewContext';
import LoadingSpinner from '../../components/LoadingSpinner';

interface OverviewStats {
  totalDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  totalValue: number;
  totalPages: number;
  myAuthentications: number;
  myAuthenticationsThisMonth: number;
  averageProcessingTime: number;
  topLanguages: Array<{ language: string; count: number }>;
  recentActivity: Array<{
    id: string;
    filename: string;
    action: string;
    date: string;
    user_name: string;
  }>;
}

interface AuthenticatorOverviewProps {
  onNavigate?: (page: 'authenticate' | 'translated') => void;
}

export default function AuthenticatorOverview({ onNavigate }: AuthenticatorOverviewProps) {
  const { user: currentUser } = useAuth();
  const { stats, loading, error, refreshStats, lastUpdated } = useOverview();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" color="blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 sm:gap-6">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Authenticator Overview</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back! Here's your authentication dashboard overview.
                {lastUpdated && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshStats}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="blue" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-1">Total Documents</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalDocuments}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-1">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pendingDocuments}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-1">Approved</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.approvedDocuments}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm sm:text-base text-gray-600 mb-1">Total Value</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">${stats.totalValue.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* My Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* My Authentications */}
          <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">My Authentications</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base text-gray-600">Total Authenticated</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.myAuthentications}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base text-gray-600">This Month</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.myAuthenticationsThisMonth}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Quick Actions</h2>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => onNavigate?.('authenticate')}
                className="w-full flex items-center gap-3 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-blue-900">Authenticate Documents</p>
                  <p className="text-sm text-blue-700">{stats.pendingDocuments} pending</p>
                </div>
              </button>
              
              <button
                onClick={() => onNavigate?.('translated')}
                className="w-full flex items-center gap-3 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-green-900">View Translated</p>
                  <p className="text-sm text-green-700">{stats.approvedDocuments} completed</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Top Languages */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Top Languages</h2>
            </div>
            
            <div className="space-y-3">
              {stats.topLanguages.length > 0 ? (
                stats.topLanguages.map((lang, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm sm:text-base font-medium text-gray-700">{lang.language}</span>
                    <span className="text-sm sm:text-base font-bold text-indigo-600">{lang.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm sm:text-base text-gray-500 text-center py-4">No language data available</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Activity</h2>
            </div>
            
            <div className="space-y-3">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{activity.filename}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {activity.action} • {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm sm:text-base text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 