import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyMigration() {
    console.log('Updating handle_new_user trigger function...')

    const sqlPath = path.join(__dirname, 'update_handle_new_user.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Try using RPC first
    const { error } = await supabase.rpc('exec', { sql })

    if (error) {
        console.error('RPC error:', error)
        console.log('Please run the SQL script manually in Supabase SQL Editor.')
        console.log('Script path:', sqlPath)
        return
    }

    console.log('✅ Trigger function updated successfully')
}

applyMigration()
