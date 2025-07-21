import React, { useState, useEffect } from 'react';
import { XCircle, FileText, User, Calendar, DollarSign, Hash, Eye, Download, Phone } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';

interface DocumentDetailsModalProps {
  document: Document | null;
  onClose: () => void;
}

export function DocumentDetailsModal({ document, onClose }: DocumentDetailsModalProps) {
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (document) {
      fetchUserProfile();
    }
  }, [document]);

  const fetchUserProfile = async () => {
    if (!document) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', document.user_id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (!document) return null;

  const handleDownload = async () => {
    if (document.file_url) {
      try {
        const response = await fetch(document.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        alert('Error downloading file');
      }
    }
  };

  const handleViewFile = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Document Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-semibold text-gray-900">File Information</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Filename</label>
                <p className="text-gray-900 break-all">{document.filename}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Pages</label>
            <p className="text-gray-900">{document.pages}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Total Cost</label>
                <p className="text-gray-900 font-semibold">${document.total_cost}.00</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    {getStatusIcon(document.status)}
                    <span className="ml-1 capitalize">{document.status}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <User className="w-6 h-6 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-900">User Information</h4>
            </div>
            {loadingProfile ? (
              <div className="text-gray-500">Loading user information...</div>
            ) : userProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{userProfile.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900 break-all">{userProfile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <p className="text-gray-900">{userProfile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-gray-900 font-mono text-sm break-all">{document.user_id}</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">User information not available</div>
            )}
          </div>
          
          {/* Document Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Hash className="w-6 h-6 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-900">Document Details</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Translation Type</label>
                <p className="text-gray-900">{document.tipo_trad || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Source Language</label>
                <p className="text-gray-900">{document.idioma_raiz || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Bank Statement</label>
                <p className="text-gray-900">{document.is_bank_statement ? 'Yes' : 'No'}</p>
              </div>
          <div>
                <label className="text-sm font-medium text-gray-700">Authenticated</label>
                <p className="text-gray-900">{document.is_authenticated ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
          
          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-orange-600" />
              <h4 className="text-lg font-semibold text-gray-900">Timeline</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{document.created_at ? new Date(document.created_at).toLocaleString() : 'Not available'}</p>
              </div>
          <div>
                <label className="text-sm font-medium text-gray-700">Last Updated</label>
                <p className="text-gray-900">{document.updated_at ? new Date(document.updated_at).toLocaleString() : 'Not available'}</p>
              </div>
            </div>
          </div>
          
          {/* Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Hash className="w-6 h-6 text-red-600" />
              <h4 className="text-lg font-semibold text-gray-900">Verification</h4>
            </div>
          <div>
              <label className="text-sm font-medium text-gray-700">Verification Code</label>
              <p className="text-gray-900 font-mono text-sm break-all">{document.verification_code}</p>
            </div>
          </div>

          {/* Actions */}
          {document.file_url && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">File Actions</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleViewFile}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View File
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}