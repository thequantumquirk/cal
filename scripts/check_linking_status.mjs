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

async function checkLinking() {
    // Replace this with the email you just tested
    const email = 'sanjixo64@gmail.com'

    console.log(`Checking linking status for: ${email}`)

    // 1. Check User
    const { data: user } = await supabase
        .from('users_new')
        .select('id, email')
        .eq('email', email)
        .single()

    if (!user) {
        console.log('❌ User NOT found in users_new table!')
        return
    }
    console.log('✅ User found:', user)

    // 2. Check Shareholder Record
    const { data: shareholder } = await supabase
        .from('shareholders_new')
        .select('id, email, user_id, issuer_id')
        .eq('email', email)
        .maybeSingle()

    if (!shareholder) {
        console.log('❌ No shareholder record found for this email.')
    } else {
        console.log('✅ Shareholder record found:', shareholder)
        if (shareholder.user_id === user.id) {
            console.log('✅ LINKED! user_id matches.')
        } else {
            console.log(`❌ NOT LINKED. Shareholder user_id is: ${shareholder.user_id} (Expected: ${user.id})`)
        }
    }
}

checkLinking()
