#!/usr/bin/env node

// Test script pre kontrolu login response na serveri
import axios from 'axios';

const SERVER_URL = process.argv[2] || 'http://localhost:5001';

async function testLogin() {
  console.log(`🧪 Testujem login na ${SERVER_URL}...`);
  
  try {
    // Test login
    console.log('\n🔐 Testujem /api/login...');
    const loginResponse = await axios.post(`${SERVER_URL}/api/login`, {
      email: 'rado.sloboda@codeway.sk',
      password: 'Bojnicky428'
    });
    
    console.log(`✅ Login API: ${loginResponse.status}`);
    console.log(`📋 Login response:`, JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.data.user?.isAdmin) {
      console.log(`\n✅ Admin status: ${loginResponse.data.user.isAdmin} (${loginResponse.data.user.userType})`);
    } else {
      console.log(`\n⚠️ Admin status: CHÝBA!`);
      console.log(`📋 Dostupné polia:`, Object.keys(loginResponse.data.user || {}));
    }
    
    // Test profile endpoint
    console.log('\n👤 Testujem /api/profile...');
    try {
      const profileResponse = await axios.get(`${SERVER_URL}/api/profile`, {
        headers: {
          'Cookie': loginResponse.headers['set-cookie']?.join('; ')
        }
      });
      
      console.log(`✅ Profile API: ${profileResponse.status}`);
      console.log(`📋 Profile response:`, JSON.stringify(profileResponse.data, null, 2));
      
    } catch (profileError) {
      if (profileError.response) {
        console.log(`❌ Profile API: ${profileError.response.status} - ${profileError.response.data.error}`);
      } else {
        console.log(`❌ Profile API: ${profileError.message}`);
      }
    }
    
    console.log('\n🎉 Test dokončený!');
    
  } catch (error) {
    console.log(`❌ Chyba pri testovaní: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

testLogin();
