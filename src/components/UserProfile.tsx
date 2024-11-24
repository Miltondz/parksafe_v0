import React, { useState, useEffect } from 'react';
import { User, Settings, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import toast from 'react-hot-toast';

interface Profile {
  full_name: string;
  avatar_url: string;
  bio: string;
  emergency_contact: string;
}

const UserProfile: React.FC = () => {
  const { user } = useUserStore();
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    avatar_url: '',
    bio: '',
    emergency_contact: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) throw error;

      if (currentUser?.user_metadata) {
        setProfile({
          full_name: currentUser.user_metadata.full_name || '',
          avatar_url: currentUser.user_metadata.avatar_url || '',
          bio: currentUser.user_metadata.bio || '',
          emergency_contact: currentUser.user_metadata.emergency_contact || ''
        });
      }
    } catch (error: any) {
      toast.error('Failed to load profile');
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: profile
      });

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <User className="w-5 h-5 mr-2" />
          Profile
        </h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
        >
          <Settings className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`}
              alt="Profile"
              className="w-16 h-16 rounded-full"
            />
            {isEditing && (
              <button className="absolute bottom-0 right-0 p-1 bg-indigo-600 rounded-full text-white">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <h3 className="font-medium">{profile.full_name || user?.email}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-gray-900">{profile.full_name || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            {isEditing ? (
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-gray-900">{profile.bio || 'No bio added'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={profile.emergency_contact}
                onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Emergency contact number"
              />
            ) : (
              <p className="text-gray-900">{profile.emergency_contact || 'Not set'}</p>
            )}
          </div>

          {isEditing && (
            <button
              onClick={updateProfile}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                'Save Changes'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;