import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw } from 'lucide-react';

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
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl shadow p-8">
      <h2 className="text-3xl font-bold mb-6 text-gray-900">My Profile</h2>
      {loading && (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin text-tfe-blue-500" />
        </div>
      )}
      {error && <p className="text-tfe-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-600 mb-4">{success}</p>}
      {!loading && profile && (
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500"
              required
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500"
              required
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500"
              placeholder="Enter your phone number"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-tfe-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-tfe-blue-700 transition-colors"
            disabled={loading}
          >
            Save Changes
          </button>
        </form>
      )}
    </div>
  );
} 