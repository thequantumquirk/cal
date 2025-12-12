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

async function backfillRole() {
    const email = 'sanjixo64@gmail.com'
    console.log(`Backfilling role for: ${email}`)

    // 1. Get User
    const { data: user } = await supabase.from('users_new').select('id').eq('email', email).single()
    if (!user) {
        console.log('User not found')
        return
    }

    // 2. Get Shareholder Role
    const { data: role } = await supabase.from('roles_new').select('id').eq('role_name', 'Shareholder').single()
    if (!role) {
        console.log('Role not found')
        return
    }

    // 3. Insert Issuer-less Role
    const { data, error } = await supabase
        .from('issuer_users_new')
        .insert({
            user_id: user.id,
            issuer_id: null,
            role_id: role.id,
            is_primary: true // We can set this to true as it's their primary (and only) role
        })
        .select()

    if (error) {
        console.error('❌ Insert failed:', error.message)
    } else {
        console.log('✅ Role backfilled successfully!', data)
    }
}

backfillRole()
