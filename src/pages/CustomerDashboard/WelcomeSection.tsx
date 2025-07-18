import React from 'react';
import { User, Upload } from 'lucide-react';
import { CustomUser } from '../../hooks/useAuth';
import { NotificationBell } from '../../components/NotificationBell';

interface WelcomeSectionProps {
  user: CustomUser | null;
  onUploadClick: () => void;
}

export function WelcomeSection({ user, onUploadClick }: WelcomeSectionProps) {
  return (
    <div className="bg-gradient-to-r from-blue-900 to-red-600 text-white rounded-2xl p-8 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome back, {user?.user_metadata?.name || 'User'}!</h1>
              <p className="text-blue-100">{user?.email}</p>
            </div>
          </div>
          <p className="text-blue-100 mb-6 max-w-2xl">
            Upload your documents for professional translation services. 
            All translations are certified and accepted by USCIS and US authorities.
          </p>
        </div>
        <div className="hidden md:block flex items-center gap-4">
          <NotificationBell />
          <button
            onClick={onUploadClick}
            className="bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>
      
      {/* Mobile upload button */}
      <div className="md:hidden mt-4 flex items-center gap-4">
        <NotificationBell />
        <button
          onClick={onUploadClick}
          className="flex-1 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Document</span>
        </button>
      </div>
    </div>
  );
}