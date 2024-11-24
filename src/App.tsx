import React, { useState, useEffect } from 'react';
import { 
  Trees, 
  UserCircle2,
  LogIn, 
  LogOut,
  Bird,
  LayoutDashboard
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { useUserStore } from './stores/userStore';
import Map from './components/Map';
import PanicButton from './components/PanicButton';
import Auth from './components/Auth';
import EmergencyAlerts from './components/EmergencyAlerts';
import GroupManagement from './components/GroupManagement';
import UserProfile from './components/UserProfile';
import MessageCenter from './components/MessageCenter';
import TestDashboard from './components/TestDashboard';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, setUser } = useUserStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update user location periodically (only for regular users)
  useEffect(() => {
    if (!user || user.user_metadata?.is_admin) return;

    const updateLocation = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          await supabase
            .from('profiles')
            .update({
              location: { lat, lng },
              last_active: new Date().toISOString()
            })
            .eq('id', user.id);
        });
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-park-light/20 px-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <Trees className="w-20 h-20 mx-auto text-park-primary mb-4" />
              <h1 className="text-4xl font-bold text-park-dark mb-2">Welcome to ParkSafe</h1>
              <p className="text-park-primary">Sign in to access safety features and stay connected.</p>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-park-primary hover:bg-park-dark"
            >
              <LogIn className="w-6 h-6 mr-2" />
              Sign In / Sign Up
            </button>
          </div>
        </div>
      );
    }

    // Admin view
    if (user.user_metadata?.is_admin) {
      return activeTab === 'profile' ? <UserProfile /> : <AdminDashboard />;
    }

    // Regular user view
    switch (activeTab) {
      case 'map':
        return (
          <div className="flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex-1 relative">
              <Map />
              <PanicButton />
              <MessageCenter />
            </div>
          </div>
        );
      case 'groups':
        return <GroupManagement />;
      case 'profile':
        return <UserProfile />;
      case 'test':
        return <TestDashboard />;
      default:
        return <Map />;
    }
  };

  return (
    <div className="min-h-screen bg-park-light/20 flex flex-col">
      {user && (
        <header className="bg-park-primary text-white px-4 py-3">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Trees className="w-8 h-8 mr-2" />
              <h1 className="text-xl font-semibold">ParkSafe</h1>
            </div>
            {user.user_metadata?.is_admin && (
              <span className="text-park-accent font-medium">Administrator</span>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 relative">
        {renderContent()}
        {!user?.user_metadata?.is_admin && <EmergencyAlerts />}
      </main>

      {user && (
        <nav className="bg-park-primary text-white fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-screen-xl mx-auto px-4">
            <div className="flex justify-around h-16">
              {user.user_metadata?.is_admin ? (
                // Admin Navigation
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center justify-center w-full ${
                      activeTab === 'dashboard'
                        ? 'text-park-accent'
                        : 'text-white hover:text-park-light'
                    }`}
                  >
                    <LayoutDashboard className="w-8 h-8" />
                    <span className="text-xs mt-1">Dashboard</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center justify-center w-full ${
                      activeTab === 'profile'
                        ? 'text-park-accent'
                        : 'text-white hover:text-park-light'
                    }`}
                  >
                    <UserCircle2 className="w-8 h-8" />
                    <span className="text-xs mt-1">Profile</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex flex-col items-center justify-center w-full text-white hover:text-park-light"
                  >
                    <LogOut className="w-8 h-8" />
                    <span className="text-xs mt-1">Logout</span>
                  </button>
                </>
              ) : (
                // Regular User Navigation
                <>
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`flex flex-col items-center justify-center w-full ${
                      activeTab === 'map'
                        ? 'text-park-accent'
                        : 'text-white hover:text-park-light'
                    }`}
                  >
                    <Bird className="w-8 h-8" />
                    <span className="text-xs mt-1">Map</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex flex-col items-center justify-center w-full ${
                      activeTab === 'groups'
                        ? 'text-park-accent'
                        : 'text-white hover:text-park-light'
                    }`}
                  >
                    <Trees className="w-8 h-8" />
                    <span className="text-xs mt-1">Groups</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('test')}
                    className={`flex flex-col items-center justify-center w-full ${
                      activeTab === 'test'
                        ? 'text-park-accent'
                        : 'text-white hover:text-park-light'
                    }`}
                  >
                    <Bird className="w-8 h-8" />
                    <span className="text-xs mt-1">Test</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center justify-center w-full ${
                      activeTab === 'profile'
                        ? 'text-park-accent'
                        : 'text-white hover:text-park-light'
                    }`}
                  >
                    <UserCircle2 className="w-8 h-8" />
                    <span className="text-xs mt-1">Profile</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex flex-col items-center justify-center w-full text-white hover:text-park-light"
                  >
                    <LogOut className="w-8 h-8" />
                    <span className="text-xs mt-1">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      <Auth isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <Toaster position="top-right" />
    </div>
  );
};

export default App;