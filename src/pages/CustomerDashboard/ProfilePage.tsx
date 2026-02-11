import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, User, Mail, Phone, Save } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('User not found');
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', user.id)
          .single();
        if (error || !data) throw new Error('Profile not found');
        setProfile(data);
        setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
      } catch (err: any) {
        setError(err.message || 'Error loading profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not found');
      const { error } = await supabase
        .from('profiles')
        .update({ name: form.name, email: form.email, phone: form.phone })
        .eq('id', user.id);
      if (error) throw error;
      setSuccess('Profile updated successfully!');
      setProfile({ name: form.name, email: form.email, phone: form.phone });
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 relative z-10">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight">
            MY PROFILE
          </h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            Manage your personal information
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg p-8 border border-gray-200">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C71B2D]" />
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-600 font-medium text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-green-600 font-medium text-sm">{success}</p>
            </div>
          )}

          {!loading && profile && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Name Field */}
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#C71B2D]/20 focus:border-[#C71B2D] transition-all font-medium text-gray-900 placeholder-gray-400"
                  required
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field */}
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#C71B2D]/20 focus:border-[#C71B2D] transition-all font-medium text-gray-900 placeholder-gray-400"
                  required
                  placeholder="Enter your email"
                />
              </div>

              {/* Phone Field */}
              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#C71B2D]/20 focus:border-[#C71B2D] transition-all font-medium text-gray-900 placeholder-gray-400"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="relative w-full bg-[#C71B2D] hover:bg-[#A01624] text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-wider transition-all hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(199,27,45,0.3)] flex items-center justify-center space-x-2 overflow-hidden group mt-8"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <Save className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Save Changes</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
 