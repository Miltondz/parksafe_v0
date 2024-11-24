import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Bird, X, PauseCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useUserStore } from '../stores/userStore';

interface Alert {
  id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  metadata?: {
    severity?: 'low' | 'medium' | 'high';
    location?: {
      lat: number;
      lng: number;
    };
  };
}

const EmergencyAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useUserStore();

  const fetchAlerts = useCallback(async () => {
    if (!user || isPaused) return;

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchError) throw fetchError;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      setError('Failed to load emergency alerts');
    } finally {
      setLoading(false);
    }
  }, [user, isPaused]);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user, fetchAlerts]);

  useEffect(() => {
    if (!user || isPaused) return;

    const channel = supabase
      .channel('emergency_alerts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'emergency_alerts' 
      }, (payload) => {
        const newAlert = payload.new as Alert;
        setAlerts(prev => {
          const updated = [newAlert, ...prev].slice(0, 5);
          return Array.from(new Map(updated.map(alert => [alert.id, alert])).values());
        });
        
        if (!isPaused) {
          toast((t) => (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-park-danger" />
              <div>
                <p className="font-semibold">Emergency Alert</p>
                <p className="text-sm">{newAlert.message || `New ${newAlert.type} alert`}</p>
              </div>
            </div>
          ), {
            duration: 10000,
            position: 'top-center',
          });
        }
      });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isPaused]);

  if (!user || !isVisible || alerts.length === 0) return null;

  return (
    <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 pt-4">
      <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-park-danger">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Bird className="w-5 h-5 text-park-danger" />
            <h3 className="font-semibold text-park-danger">Emergency Alerts</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1 hover:text-park-primary transition-colors"
              title={isPaused ? "Resume alerts" : "Pause alerts"}
            >
              {isPaused ? (
                <PlayCircle className="w-5 h-5" />
              ) : (
                <PauseCircle className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:text-park-primary transition-colors"
              title="Close alerts"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-park-primary"></div>
          </div>
        ) : error ? (
          <div className="text-park-danger text-center py-2">{error}</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-2 bg-red-50 rounded-md"
              >
                <p className="text-sm font-medium text-park-danger">
                  {alert.message || `${alert.type.replace('_', ' ')} alert`}
                </p>
                <p className="text-xs text-park-danger/80 mt-1">
                  {new Date(alert.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyAlerts;