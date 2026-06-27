
import { getSupabaseClient } from '../src/config/database';

async function checkAdmins() {
  const supabase = getSupabaseClient();
  console.log('Checking admins table...');
  const { data, error } = await supabase.from('admins').select('id, email, created_at');
  
  if (error) {
    console.error('Error fetching admins:', error);
  } else {
    console.log('Admins found:', data);
  }
}

checkAdmins();
