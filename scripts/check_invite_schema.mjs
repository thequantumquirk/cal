import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
    // Try to insert an invite with NULL issuer_id
    const { data, error } = await supabase
        .from('invited_users_new')
        .insert({
            email: 'test_null_issuer@example.com',
            role_id: '72bc76fc-3c19-4cc8-bc04-d631cfe0bc2b', // Shareholder role ID from previous check
            issuer_id: null
        })
        .select()

    if (error) {
        console.error('Error inserting null issuer:', error)
    } else {
        console.log('Successfully inserted invite with NULL issuer_id:', data)
        // Clean up
        await supabase.from('invited_users_new').delete().eq('email', 'test_null_issuer@example.com')
    }
}

checkSchema()
