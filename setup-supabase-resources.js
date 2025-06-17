#!/usr/bin/env node

/**
 * Setup Supabase resources for NeonMerge
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

async function setupSupabaseResources() {
  console.log('🚀 Setting up Supabase resources for NeonMerge...\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Create the merged_pdfs table
    console.log('📋 Creating merged_pdfs table...');
    const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS merged_pdfs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          filename TEXT NOT NULL,
          file_url TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          file_size INTEGER
        );
        
        CREATE INDEX IF NOT EXISTS idx_merged_pdfs_created_at ON merged_pdfs(created_at DESC);
        
        ALTER TABLE merged_pdfs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Allow all operations on merged_pdfs" ON merged_pdfs
          FOR ALL USING (true);
      `
    });
    
    if (tableError) {
      console.log('❌ Table creation failed:', tableError.message);
      console.log('💡 You may need to run the SQL manually in your Supabase dashboard');
    } else {
      console.log('✅ Table created successfully');
    }
    
    // Try to create storage bucket
    console.log('🗂️  Creating storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('pdfbucket', {
      public: true
    });
    
    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Storage bucket already exists');
      } else {
        console.log('❌ Bucket creation failed:', bucketError.message);
        console.log('💡 Create it manually in your Supabase dashboard');
      }
    } else {
      console.log('✅ Storage bucket created successfully');
    }
    
    console.log('\n🎉 Setup completed!');
    console.log('\n📚 Next steps:');
    console.log('1. Run: node test-neonmerge.js to verify everything works');
    console.log('2. Start your backend: npm start');
    console.log('3. Open frontend/index.html in your browser');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Manual setup required:');
    console.log('1. Go to your Supabase dashboard SQL Editor');
    console.log('2. Run the SQL from supabase-setup.sql');
    console.log('3. Go to Storage and create a bucket named "pdfbucket"');
  }
}

setupSupabaseResources();
