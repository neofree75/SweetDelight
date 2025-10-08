#!/usr/bin/env node

// Test script pre kontrolu servera
const axios = require('axios');

const SERVER_URL = process.argv[2] || 'http://localhost:5001';

async function testServer() {
  console.log(`🧪 Testujem server na ${SERVER_URL}...`);
  
  try {
    // Test 1: Základné API
    console.log('\n1️⃣ Testujem /api/products...');
    const productsResponse = await axios.get(`${SERVER_URL}/api/products`);
    console.log(`✅ Products API: ${productsResponse.status} - ${productsResponse.data.length} produktov`);
    
    // Test 2: Gallery API
    console.log('\n2️⃣ Testujem /api/gallery...');
    const galleryResponse = await axios.get(`${SERVER_URL}/api/gallery`);
    console.log(`✅ Gallery API: ${galleryResponse.status} - ${galleryResponse.data.images.length} obrázkov`);
    
    // Test 3: Login API
    console.log('\n3️⃣ Testujem /api/login...');
    try {
      const loginResponse = await axios.post(`${SERVER_URL}/api/login`, {
        email: 'rado.sloboda@codeway.sk',
        password: 'Bojnicky428'
      });
      
      console.log(`✅ Login API: ${loginResponse.status}`);
      console.log(`📋 Login response:`, {
        success: loginResponse.data.success,
        hasUser: !!loginResponse.data.user,
        hasIsAdmin: !!loginResponse.data.user?.isAdmin,
        hasUserType: !!loginResponse.data.user?.userType,
        userEmail: loginResponse.data.user?.email
      });
      
      if (loginResponse.data.user?.isAdmin) {
        console.log(`✅ Admin status: ${loginResponse.data.user.isAdmin} (${loginResponse.data.user.userType})`);
      } else {
        console.log(`⚠️ Admin status: CHÝBA!`);
      }
      
    } catch (loginError) {
      if (loginError.response) {
        console.log(`❌ Login API: ${loginError.response.status} - ${loginError.response.data.error}`);
      } else {
        console.log(`❌ Login API: ${loginError.message}`);
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

testServer();
