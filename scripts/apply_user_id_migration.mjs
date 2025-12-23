import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
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
    console.log('Applying user_id migration to shareholders_new...')

    const sqlPath = path.join(__dirname, 'add_user_id_to_shareholders.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    const { error } = await supabase.rpc('exec', { sql })

    if (error) {
        console.error('Migration error:', error)
        return
    }

    console.log('✅ Migration applied successfully')
}

applyMigration()
