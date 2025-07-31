import React from 'react';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Cancellation Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-tfe-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-tfe-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600">
            The payment was cancelled. Your document was not processed.
          </p>
        </div>

        {/* What happened */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">What happened?</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-tfe-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>You cancelled the payment process on Stripe</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-tfe-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Your document was not sent for translation</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-tfe-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>No charge was made to your account</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Link
            to="/customer-dashboard"
            className="inline-flex items-center px-8 py-3 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Contact Information */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Need help? Contact us:
          </p>
          <div className="text-sm text-gray-600">
            <p>Email: support@thefutureofenglish.com</p>
            <p>WhatsApp: (323) 788-3117</p>
          </div>
        </div>
      </div>
    </div>
  );
} 