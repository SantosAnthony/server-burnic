import "dotenv/config"

import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://gohvpfzeqytzypsrgkps.supabase.co'
const supabaseKey = process.env.SUPABASEKEY
const supabase = createClient(supabaseUrl, supabaseKey)

const fetchData = async () => {
  const { data, error } = await supabase.from('produtos').select('*');
  
  if (error) {
    
    console.log('Erro:', error);
  } else {
    console.log('Dados:', data);
  }
};

fetchData();


