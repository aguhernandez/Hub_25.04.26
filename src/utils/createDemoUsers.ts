import { supabase } from '../lib/supabase';

export async function createDemoUsers() {
  console.log('🔄 Creating/Updating demo users...');
  const adminPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;
  const trainerPassword = import.meta.env.VITE_DEMO_TRAINER_PASSWORD;
  if (!adminPassword || !trainerPassword) {
    return { success: false, message: 'Demo user passwords are not configured' };
  }

  try {
    // Try to sign up admin
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
      email: 'admin@asciende.com',
      password: adminPassword,
      options: {
        data: {
          full_name: 'Administrator',
          requested_role: 'admin'
        }
      }
    });

    if (adminError) {
      console.log('ℹ️ Admin user may already exist:', adminError.message);

      // If user exists, try to update the profile
      if (adminError.message.includes('already registered')) {
        console.log('✅ Admin user already exists with email: admin@asciende.com');
      }
    } else {
      console.log('✅ Admin created:', adminData?.user?.email);

    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to sign up trainer
    const { data: trainerData, error: trainerError } = await supabase.auth.signUp({
      email: 'trainer@asciende.com',
      password: trainerPassword,
      options: {
        data: {
          full_name: 'Trainer Coach',
          requested_role: 'trainer'
        }
      }
    });

    if (trainerError) {
      console.log('ℹ️ Trainer user may already exist:', trainerError.message);

      if (trainerError.message.includes('already registered')) {
        console.log('✅ Trainer user already exists with email: trainer@asciende.com');
      }
    } else {
      console.log('✅ Trainer created:', trainerData?.user?.email);

    }

    return {
      success: true,
      message: 'Demo users processed successfully'
    };
  } catch (error) {
    console.error('Error in createDemoUsers:', error);
    return {
      success: false,
      message: 'Error processing demo users'
    };
  }
}
