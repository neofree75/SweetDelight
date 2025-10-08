#!/usr/bin/env node

import axios from 'axios';

async function debugDetailed() {
    const serverUrl = process.argv[2] || 'http://localhost:5001';
    
    console.log(`🔍 Detailný debug na: ${serverUrl}`);
    
    try {
        // Step 1: Login with detailed logging
        console.log('\n🔐 KROK 1: Login s detailným logovaním...');
        
        const loginData = {
            email: 'rado.sloboda@codeway.sk',
            password: 'Bojnicky428'
        };
        
        console.log('📤 Posielam login data:', loginData);
        
        const loginResponse = await axios.post(`${serverUrl}/api/login`, loginData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Login Status:', loginResponse.status);
        console.log('📋 Login Headers:', loginResponse.headers);
        console.log('📦 Login Response Body:');
        console.log(JSON.stringify(loginResponse.data, null, 2));
        
        // Analyze response
        const user = loginResponse.data.user;
        if (user) {
            console.log('\n🔍 ANALÝZA USER OBJEKTU:');
            console.log('✅ Email:', user.email);
            console.log('✅ Name:', user.name);
            console.log('✅ isAdmin:', user.isAdmin);
            console.log('✅ userType:', user.userType);
            console.log('✅ Počet kľúčov:', Object.keys(user).length);
            console.log('📋 Všetky kľúče:', Object.keys(user));
            
            // Check if it's the short version
            if (Object.keys(user).length <= 5) {
                console.log('⚠️  DETEKOVANÁ KRÁTKA VERZIA PROFILU!');
                console.log('📋 Chýbajúce kľúče: isAdmin, userType, customerId, atď.');
            } else {
                console.log('✅ KOMPLETNÝ PROFIL - všetky údaje sú prítomné');
            }
        }
        
        // Step 2: Check session cookie
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies) {
            console.log('\n🍪 Session Cookies:');
            cookies.forEach((cookie, index) => {
                console.log(`  ${index + 1}. ${cookie}`);
            });
            
            // Step 3: Test profile endpoint
            console.log('\n👤 KROK 2: Test profile endpoint...');
            try {
                const profileResponse = await axios.get(`${serverUrl}/api/profile`, {
                    headers: {
                        'Cookie': cookies.join('; ')
                    }
                });
                
                console.log('📊 Profile Status:', profileResponse.status);
                console.log('📦 Profile Response:', JSON.stringify(profileResponse.data, null, 2));
                
            } catch (profileError) {
                console.log('❌ Profile Error:');
                console.log('   Status:', profileError.response?.status);
                console.log('   Data:', profileError.response?.data);
            }
        } else {
            console.log('❌ Žiadne session cookies neboli nastavené!');
        }
        
    } catch (error) {
        console.error('❌ Chyba:', error.message);
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📦 Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugDetailed();
