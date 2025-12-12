import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNullIssuerInsert() {
    console.log('Testing insert with NULL issuer_id...')

    // 1. Get a test user (or create one, but let's use an existing one for safety)
    // We'll just try to insert for a random UUID that doesn't exist to check constraint violation, 
    // or better, use the user we just created: 'sanjixo64@gmail.com'

    const email = 'sanjixo64@gmail.com'
    const { data: user } = await supabase.from('users_new').select('id').eq('email', email).single()

    if (!user) {
        console.log('Test user not found')
        return
    }

    // 2. Get Shareholder Role ID
    const { data: role } = await supabase.from('roles_new').select('id').eq('role_name', 'Shareholder').single()

    if (!role) {
        console.log('Shareholder role not found')
        return
    }

    // 3. Try Insert
    const { data, error } = await supabase
        .from('issuer_users_new')
        .insert({
            user_id: user.id,
            issuer_id: null, // THIS IS THE KEY TEST
            role_id: role.id
        })
        .select()

    if (error) {
        console.error('❌ Insert failed:', error.message)
        console.error('Error details:', error)
    } else {
        console.log('✅ Insert successful!', data)
    }
}

testNullIssuerInsert()
