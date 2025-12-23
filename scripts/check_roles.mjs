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

async function checkRoles() {
    const { data, error } = await supabase
        .from('roles_new')
        .select('*')
        .or('role_name.eq.shareholder,display_name.eq.Shareholder')

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Roles found:', data)
    }
}

checkRoles()
