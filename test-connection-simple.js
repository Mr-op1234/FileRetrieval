#!/usr/bin/env node

/**
 * Simple connection test for NeonMerge
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConnection() {
  console.log('🧪 Testing NeonMerge Connection...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  console.log('📍 Supabase URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Basic connection
    console.log('🔍 Testing basic connection...');
    const { data: healthData, error: healthError } = await supabase
      .from('merged_pdfs')
      .select('*')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Database connection failed:', healthError.message);
      if (healthError.message.includes('relation') && healthError.message.includes('does not exist')) {
        console.log('💡 The merged_pdfs table was not created. Please run the SQL setup again.');
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log('📊 Current records:', healthData.length);
    }
    
    // Test 2: Storage bucket test
    console.log('\n🗂️  Testing storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('❌ Storage access failed:', bucketError.message);
    } else {
      console.log('📋 Available buckets:', buckets.map(b => b.name).join(', '));
      const pdfBucket = buckets.find(b => b.name === 'pdfbucket');
      if (pdfBucket) {
        console.log('✅ Storage bucket "pdfbucket" found!');
        console.log('🔓 Public:', pdfBucket.public);
      } else {
        console.log('❌ Storage bucket "pdfbucket" not found');
      }
    }
    
    // Test 3: Try to insert a test record
    console.log('\n📝 Testing database insert...');
    const testRecord = {
      filename: 'test-connection.pdf',
      file_url: 'https://example.com/test.pdf',
      file_size: 1024
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('merged_pdfs')
      .insert([testRecord])
      .select();
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert test successful!');
      console.log('📄 Test record ID:', insertData[0]?.id);
      
      // Clean up test record
      if (insertData[0]?.id) {
        await supabase
          .from('merged_pdfs')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
  }
  
  console.log('\n🎉 Connection test completed!');
}

testConnection();
