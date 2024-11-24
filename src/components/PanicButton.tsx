import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useLocationStore } from '../stores/locationStore';
import { useUserStore } from '../stores/userStore';

const PanicButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { currentLocation } = useLocationStore();
  const { user } = useUserStore();

  const handlePanic = async () => {
    if (!user) {
      toast.error('You must be logged in to use the panic button');
      return;
    }

    if (!currentLocation) {
      toast.error('Unable to determine your location');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: user.id,
          location: currentLocation,
          status: 'active',
          type: 'panic',
          metadata: {
            location: currentLocation,
            timestamp: new Date().toISOString(),
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language
            }
          }
        });

      if (error) throw error;

      toast.success('Emergency services have been notified', {
        duration: 5000,
        icon: '🚨'
      });
    } catch (error: any) {
      console.error('Error sending panic alert:', error);
      toast.error(error.message || 'Failed to send panic alert');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePanic}
      disabled={isLoading}
      className={`fixed bottom-24 right-8 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all ${
        isLoading ? 'opacity-75 cursor-not-allowed' : 'transform hover:scale-105 active:scale-95'
      }`}
      aria-label="Emergency Panic Button"
    >
      <AlertCircle className={`w-8 h-8 ${isLoading ? 'animate-pulse' : ''}`} />
      <span className="sr-only">Emergency Panic Button</span>
    </button>
  );
};

export default PanicButton;