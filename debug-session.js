#!/usr/bin/env node

import axios from 'axios';

async function debugSession() {
    const serverUrl = process.argv[2] || 'http://localhost:5001';
    
    console.log(`🔍 Debugujem session na: ${serverUrl}`);
    
    try {
        // Step 1: Login
        console.log('\n🔐 KROK 1: Login...');
        const loginResponse = await axios.post(`${serverUrl}/api/login`, {
            email: 'rado.sloboda@codeway.sk',
            password: 'Bojnicky428'
        });
        
        console.log('📊 Login Status:', loginResponse.status);
        console.log('📦 Login Response:', JSON.stringify(loginResponse.data, null, 2));
        
        // Step 2: Extract session cookie
        const cookies = loginResponse.headers['set-cookie'];
        console.log('\n🍪 Session Cookies:', cookies);
        
        // Step 3: Test profile endpoint with session
        console.log('\n👤 KROK 2: Test profile s session...');
        try {
            const profileResponse = await axios.get(`${serverUrl}/api/profile`, {
                headers: {
                    'Cookie': cookies ? cookies.join('; ') : ''
                }
            });
            
            console.log('📊 Profile Status:', profileResponse.status);
            console.log('📦 Profile Response:', JSON.stringify(profileResponse.data, null, 2));
            
        } catch (profileError) {
            console.log('❌ Profile Error:', profileError.response?.status, profileError.response?.data);
        }
        
        // Step 4: Test session endpoint
        console.log('\n🔍 KROK 3: Test session endpoint...');
        try {
            const sessionResponse = await axios.get(`${serverUrl}/api/session`, {
                headers: {
                    'Cookie': cookies ? cookies.join('; ') : ''
                }
            });
            
            console.log('📊 Session Status:', sessionResponse.status);
            console.log('📦 Session Response:', JSON.stringify(sessionResponse.data, null, 2));
            
        } catch (sessionError) {
            console.log('❌ Session Error:', sessionError.response?.status, sessionError.response?.data);
        }
        
    } catch (error) {
        console.error('❌ Chyba:', error.message);
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📦 Data:', error.response.data);
        }
    }
}

debugSession();
