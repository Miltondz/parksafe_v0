import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { AlertTriangle, Bird, Users, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

interface UserLocation {
  id: string;
  email: string;
  full_name: string | null;
  location: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  last_active: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const AdminDashboard: React.FC = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);

  const fetchUserLocations = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, location, last_active')
        .not('location', 'is', null)
        .gte('last_active', new Date(Date.now() - 3600000).toISOString());

      if (error) throw error;

      const activeUsers = profiles
        .filter(profile => profile.location)
        .map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          location: profile.location,
          last_active: profile.last_active
        }));

      setUserLocations(activeUsers);
    } catch (error: any) {
      console.error('Error fetching user locations:', error);
      toast.error('Failed to fetch user locations');
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveAlerts(data || []);
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      toast.error('Failed to fetch alerts');
    }
  }, []);

  useEffect(() => {
    fetchUserLocations();
    refreshAlerts();
    const interval = setInterval(() => {
      fetchUserLocations();
      refreshAlerts();
    }, 10000);

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchUserLocations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_alerts'
      }, () => {
        refreshAlerts();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [fetchUserLocations, refreshAlerts]);

  const broadcastEmergencyMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          content: message,
          type: 'emergency'
        }]);

      if (messageError) throw messageError;

      const { error: alertError } = await supabase
        .from('emergency_alerts')
        .insert([{
          user_id: user.id,
          type: 'broadcast',
          message: message,
          status: 'active'
        }]);

      if (alertError) throw alertError;

      toast.success('Emergency broadcast sent successfully');
      setMessage('');
      await refreshAlerts();
    } catch (error: any) {
      toast.error('Failed to send broadcast');
      console.error('Broadcast error:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      // First, update the alert status to inactive
      const { error: updateError } = await supabase
        .from('emergency_alerts')
        .update({ status: 'inactive' })
        .eq('id', alertId);

      if (updateError) throw updateError;

      // Then, delete the alert
      const { error: deleteError } = await supabase
        .from('emergency_alerts')
        .delete()
        .eq('id', alertId);

      if (deleteError) throw deleteError;

      // Update the local state immediately
      setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast.success('Alert deleted successfully');
    } catch (error) {
      toast.error('Failed to delete alert');
      console.error('Deletion error:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 pb-20">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Users className="w-6 h-6 text-park-primary mr-2" />
          Active Users ({userLocations.length})
        </h2>
        
        <div className="h-[500px] rounded-lg overflow-hidden mb-6">
          <MapContainer
            center={[-33.4489, -70.6693]} // Santiago, Chile
            zoom={12}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocations.map((userLoc) => (
              <Marker
                key={userLoc.id}
                position={[userLoc.location.lat, userLoc.location.lng]}
                icon={customIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{userLoc.full_name || userLoc.email}</p>
                    <p className="text-gray-500">
                      Last active: {new Date(userLoc.last_active).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 text-park-danger mr-2" />
            Emergency Broadcast
          </h3>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter emergency broadcast message..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-park-primary"
            rows={4}
          />
          
          <button
            onClick={broadcastEmergencyMessage}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-park-danger text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Bird className="w-5 h-5 mr-2" />
                Send Emergency Broadcast
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <AlertTriangle className="w-6 h-6 text-park-danger mr-2" />
          Active Emergency Alerts
        </h2>
        
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-park-danger">{alert.message}</p>
                <p className="text-sm text-gray-500">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteAlert(alert.id)}
                className="p-2 text-park-danger hover:bg-red-100 rounded-full transition-colors"
                title="Delete alert"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {activeAlerts.length === 0 && (
            <p className="text-center text-gray-500 py-4">No active alerts</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;