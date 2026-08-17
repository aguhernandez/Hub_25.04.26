import { supabase } from '../lib/supabase';

export async function createDemoUsers() {
  console.log('🔄 Creating/Updating demo users...');

  try {
    // Try to sign up admin
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
      email: 'admin@asciende.com',
      password: 'admin123',
      options: {
        data: {
          full_name: 'Administrator',
          role: 'admin'
        }
      }
    });

    if (adminError) {
      console.log('ℹ️ Admin user may already exist:', adminError.message);

      // If user exists, try to update the profile
      if (adminError.message.includes('already registered')) {
        console.log('✅ Admin user already exists with email: admin@asciende.com');
        console.log('   Password should be: admin123');
        console.log('   If you cannot login, please:');
        console.log('   1. Go to Supabase Dashboard > Authentication > Users');
        console.log('   2. Find admin@asciende.com');
        console.log('   3. Click "..." menu > Reset Password');
        console.log('   4. Set new password to: admin123');
      }
    } else {
      console.log('✅ Admin created:', adminData?.user?.email);

      // Update profile with role
      if (adminData.user) {
        await supabase
          .from('profiles')
          .update({
            role: 'admin',
            full_name: 'Administrator'
          })
          .eq('id', adminData.user.id);
      }
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to sign up trainer
    const { data: trainerData, error: trainerError } = await supabase.auth.signUp({
      email: 'trainer@asciende.com',
      password: 'trainer123',
      options: {
        data: {
          full_name: 'Trainer Coach',
          role: 'trainer'
        }
      }
    });

    if (trainerError) {
      console.log('ℹ️ Trainer user may already exist:', trainerError.message);

      if (trainerError.message.includes('already registered')) {
        console.log('✅ Trainer user already exists with email: trainer@asciende.com');
        console.log('   Password should be: trainer123');
        console.log('   If you cannot login, please:');
        console.log('   1. Go to Supabase Dashboard > Authentication > Users');
        console.log('   2. Find trainer@asciende.com');
        console.log('   3. Click "..." menu > Reset Password');
        console.log('   4. Set new password to: trainer123');
      }
    } else {
      console.log('✅ Trainer created:', trainerData?.user?.email);

      // Update profile with role
      if (trainerData.user) {
        await supabase
          .from('profiles')
          .update({
            role: 'trainer',
            full_name: 'Trainer Coach'
          })
          .eq('id', trainerData.user.id);
      }
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
