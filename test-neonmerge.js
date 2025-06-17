#!/usr/bin/env node

/**
 * Test NeonMerge Backend
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConnection() {
  console.log('🧪 Testing NeonMerge Supabase Connection...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || supabaseUrl.includes('your-project-url')) {
    console.log('❌ Please update your SUPABASE_URL in backend/.env');
    return;
  }
  
  console.log('📍 Supabase URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('merged_pdfs')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('❌ Database test failed:', error.message);
      console.log('💡 Make sure to run the SQL setup script in your Supabase dashboard');
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test storage bucket
    console.log('🗂️  Testing storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('❌ Storage test failed:', bucketError.message);
    } else {
      const pdfBucket = buckets.find(b => b.name === 'pdfbucket');
      if (pdfBucket) {
        console.log('✅ Storage bucket "pdfbucket" found');
      } else {
        console.log('⚠️  Storage bucket "pdfbucket" not found');
        console.log('💡 Create it in your Supabase dashboard: Storage > Create bucket > "pdfbucket"');
      }
    }
    
    console.log('\n🎉 Connection test completed!');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
}

testConnection();