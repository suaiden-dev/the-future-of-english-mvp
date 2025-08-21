import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DateRange } from '../../components/DateRangeFilter';

interface PaymentStatsCardsProps {
  dateRange?: DateRange;
}

export function PaymentStatsCards({ dateRange }: PaymentStatsCardsProps) {
  const [stats, setStats] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentStats();
  }, [dateRange]);

  const loadPaymentStats = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Carregando estatísticas de pagamentos...', { dateRange });
      
      // Buscar dados diretamente da tabela de pagamentos como fallback
      console.log('📊 Tentando buscar dados diretamente da tabela payments...');
      
      // Buscar estatísticas gerais
      let query = supabase.from('payments').select('*');
      
      if (dateRange?.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString());
      }
      
      const { data: allPayments, error: paymentsError } = await query;
      
      if (paymentsError) {
        console.error('❌ Erro ao buscar pagamentos diretamente:', paymentsError);
      } else {
        console.log('💰 Pagamentos encontrados:', allPayments);
        
        // Calcular estatísticas manualmente
        const totalPayments = allPayments?.length || 0;
        const totalAmount = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const avgPayment = totalPayments > 0 ? totalAmount / totalPayments : 0;
        const successfulPayments = allPayments?.filter(p => p.status === 'completed').length || 0;
        
        const calculatedStats = {
          total_payments: totalPayments,
          total_amount: totalAmount,
          avg_payment: avgPayment,
          successful_payments: successfulPayments
        };
        
        console.log('📈 Estatísticas calculadas:', calculatedStats);
        setStats(calculatedStats);
      }

      // Buscar estatísticas dos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      console.log('🔍 Buscando dados dos últimos 7 dias diretamente da tabela...');
      
      const { data: weeklyPayments, error: weeklyError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .lte('created_at', new Date().toISOString());
        
      if (weeklyError) {
        console.error('❌ Erro ao buscar pagamentos semanais:', weeklyError);
      } else {
        console.log('📅 Pagamentos semanais encontrados:', weeklyPayments);
        
        // Calcular estatísticas semanais manualmente
        const weeklyTotalPayments = weeklyPayments?.length || 0;
        const weeklyTotalAmount = weeklyPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const weeklySuccessfulPayments = weeklyPayments?.filter(p => p.status === 'completed').length || 0;
        
        const calculatedWeeklyStats = {
          total_payments: weeklyTotalPayments,
          total_amount: weeklyTotalAmount,
          successful_payments: weeklySuccessfulPayments
        };
        
        console.log('📈 Estatísticas semanais calculadas:', calculatedWeeklyStats);
        setWeeklyStats(calculatedWeeklyStats);
      }

    } catch (error) {
      console.error('💥 Erro ao carregar estatísticas de pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentStatsCards = [
    {
      title: 'Total Payments',
      value: stats ? stats.total_payments?.toLocaleString() || '0' : '...',
      subtitle: 'All time payments',
      icon: CreditCard,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-900',
      loading: loading
    },
    {
      title: 'Total Amount',
      value: stats ? `$${stats.total_amount?.toFixed(2) || '0.00'}` : '...',
      subtitle: stats ? `Avg: $${(stats.avg_payment || 0).toFixed(2)}` : 'Loading...',
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      loading: loading
    },
    {
      title: 'Last 7 Days',
      value: weeklyStats ? (weeklyStats.total_payments || 0).toLocaleString() : (loading ? '...' : '0'),
      subtitle: weeklyStats ? `$${(weeklyStats.total_amount || 0).toFixed(2)}` : (loading ? 'Loading...' : '$0.00'),
      icon: TrendingUp,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      loading: loading
    },
    {
      title: 'Successful Payments',
      value: stats ? `${stats.successful_payments || 0}` : '...',
      subtitle: stats ? `${(stats.total_payments - stats.successful_payments) || 0} failed/pending` : 'Loading...',
      icon: Calendar,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-900',
      loading: loading
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {paymentStatsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {stat.title}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.loading ? (
                    <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                  ) : (
                    stat.value
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {stat.loading ? (
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  ) : (
                    stat.subtitle
                  )}
                </div>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
