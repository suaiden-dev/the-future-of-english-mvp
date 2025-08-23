import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, CreditCard, DollarSign } from 'lucide-react';
import { getEdgeFunctionAuthHeader } from '../lib/config';

interface PaymentCalculatorProps {
  pages: number;
  filename: string;
  documentId: string;
  userId: string;
  onPaymentSuccess?: () => void;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  pricePerPage: number;
  checked: boolean;
}

export function PaymentCalculator({ 
  pages, 
  filename, 
  documentId, 
  userId, 
  onPaymentSuccess 
}: PaymentCalculatorProps) {
  const [services, setServices] = useState<ServiceOption[]>([
    {
      id: 'certified',
      name: 'Certificação Oficial',
      description: 'Tradução certificada aceita por órgãos oficiais',
      pricePerPage: 10,
      checked: false
    },
    {
      id: 'notarized',
      name: 'Notarização',
      description: 'Tradução notarizada com selo oficial',
      pricePerPage: 15,
      checked: false
    },
    {
      id: 'bank_statement',
      name: 'Extrato Bancário',
      description: 'Tratamento especial para extratos bancários',
      pricePerPage: 5,
      checked: false
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePricePerPage = 20;

  // Calcular preço total
  const calculateTotalPrice = () => {
    const selectedServices = services.filter(service => service.checked);
    const additionalCost = selectedServices.reduce((sum, service) => sum + service.pricePerPage, 0);
    const totalPricePerPage = basePricePerPage + additionalCost;
    return totalPricePerPage * pages;
  };

  const totalPrice = calculateTotalPrice();

  // Atualizar serviço selecionado
  const toggleService = (serviceId: string) => {
    setServices(prev => 
      prev.map(service => 
        service.id === serviceId 
          ? { ...service, checked: !service.checked }
          : service
      )
    );
  };

  // Processar pagamento
  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('DEBUG: Iniciando processo de pagamento');
      console.log('DEBUG: Dados do pagamento:', {
        pages,
        isCertified: services.find(s => s.id === 'certified')?.checked,
        isNotarized: services.find(s => s.id === 'notarized')?.checked,
        isBankStatement: services.find(s => s.id === 'bank_statement')?.checked,
        documentId,
        userId,
        filename,
        totalPrice
      });

      const response = await fetch('/functions/v1/create-checkout-session', {
        method: 'POST',
        headers: getEdgeFunctionAuthHeader(),
        body: JSON.stringify({
          pages,
          isCertified: services.find(s => s.id === 'certified')?.checked || false,
          isNotarized: services.find(s => s.id === 'notarized')?.checked || false,
          isBankStatement: services.find(s => s.id === 'bank_statement')?.checked || false,
          documentId,
          userId,
          filename
        })
      });

      console.log('DEBUG: Resposta da Edge Function:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();
      console.log('DEBUG: URL do Stripe Checkout:', url);

      // Redirecionar para o Stripe Checkout
      window.location.href = url;

    } catch (err: any) {
      console.error('ERROR: Erro no pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <DollarSign className="w-8 h-8 text-green-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Calculadora de Preços</h2>
      </div>

      {/* Informações do documento */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Documento</h3>
        <div className="text-sm text-gray-600">
          <p><strong>Arquivo:</strong> {filename}</p>
          <p><strong>Páginas:</strong> {pages}</p>
          <p><strong>Preço base:</strong> ${basePricePerPage} por página</p>
        </div>
      </div>

      {/* Serviços disponíveis */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Serviços Adicionais</h3>
        <div className="space-y-3">
          {services.map((service) => (
            <label key={service.id} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={service.checked}
                onChange={() => toggleService(service.id)}
                className="mt-1 h-4 w-4 text-tfe-blue-600 focus:ring-tfe-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{service.name}</span>
                  <span className="text-sm font-medium text-tfe-blue-600">
                    +${service.pricePerPage}/página
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Resumo do preço */}
      <div className="bg-tfe-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Resumo do Preço</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Preço base ({pages} páginas × ${basePricePerPage})</span>
            <span>${basePricePerPage * pages}</span>
          </div>
          {services.filter(s => s.checked).map(service => (
            <div key={service.id} className="flex justify-between text-tfe-blue-700">
              <span>{service.name} ({pages} páginas × ${service.pricePerPage})</span>
              <span>+${service.pricePerPage * pages}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-green-600">${totalPrice}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão de pagamento */}
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processando...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pagar ${totalPrice}</span>
          </>
        )}
      </button>

      {/* Mensagem de erro */}
      {error && (
        <div className="mt-4 p-3 bg-tfe-red-50 border border-tfe-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-tfe-red-600" />
          <span className="text-tfe-red-800 text-sm">{error}</span>
        </div>
      )}

      {/* Informações de segurança */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Pagamento seguro processado pelo Stripe</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Seus dados de pagamento são criptografados e nunca armazenados em nossos servidores.
        </p>
      </div>
    </div>
  );
} 