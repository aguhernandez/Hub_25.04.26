import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
