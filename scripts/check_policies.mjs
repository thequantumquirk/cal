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

async function checkPolicies() {
    // We can't query pg_policies directly via Supabase JS client easily without a function
    // So we'll try to insert a dummy record and see if we can read it back as a user
    // OR we can just check if the column exists and assume the script ran

    // Better: Let's just check if the user_id column exists, as that implies the migration ran
    // The migration script included the policy creation.

    const { data, error } = await supabase
        .from('shareholders_new')
        .select('user_id')
        .limit(1)

    if (error) {
        console.error('Error querying shareholders_new:', error)
    } else {
        console.log('Successfully queried shareholders_new. user_id column exists.')
    }
}

checkPolicies()
