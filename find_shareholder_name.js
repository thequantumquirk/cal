
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findShareholder() {
    const shareholderId = '92f206aa-1c55-49bd-becc-fc2acbccfb8d';
    console.log(`Searching for shareholder ID: ${shareholderId}...`);

    const { data, error } = await supabase
        .from('shareholders_new')
        .select('first_name, last_name, email')
        .eq('id', shareholderId)
        .single();

    if (error) {
        console.error('Error finding shareholder:', error.message);
    } else {
        console.log('Found Shareholder:');
        console.log(`Name: ${data.first_name} ${data.last_name}`);
        console.log(`Email: ${data.email}`);
    }
}

findShareholder();
