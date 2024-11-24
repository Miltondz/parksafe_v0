import { supabase } from './supabase';

const setupDatabase = async () => {
  try {
    // Check if user has a profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // Create profile if it doesn't exist
      if (!profile && !profileError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`,
            full_name: user.user_metadata?.full_name || null
          }]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
      }
    }
  } catch (error) {
    console.error('Error during database setup:', error);
  }
};

export default setupDatabase;