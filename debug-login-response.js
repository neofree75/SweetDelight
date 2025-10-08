#!/usr/bin/env node

import axios from 'axios';

async function testLogin() {
    const serverUrl = process.argv[2] || 'http://localhost:5001';
    
    console.log(`🔍 Testujem login na: ${serverUrl}`);
    
    try {
        const response = await axios.post(`${serverUrl}/api/login`, {
            email: 'rado.sloboda@codeway.sk',
            password: 'Bojnicky428'
        });
        
        console.log('\n📊 STATUS KÓD:', response.status);
        console.log('📋 HEADERS:', JSON.stringify(response.headers, null, 2));
        console.log('\n📦 CELÁ ODPOVEĎ:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Kontrola admin údajov
        if (response.data.user) {
            console.log('\n🔍 ANALÝZA USER OBJEKTU:');
            console.log('✅ Email:', response.data.user.email);
            console.log('✅ Name:', response.data.user.name);
            console.log('✅ isAdmin:', response.data.user.isAdmin);
            console.log('✅ userType:', response.data.user.userType);
            console.log('✅ Počet kľúčov:', Object.keys(response.data.user).length);
            console.log('📋 Všetky kľúče:', Object.keys(response.data.user));
        }
        
    } catch (error) {
        console.error('❌ Chyba:', error.message);
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📦 Data:', error.response.data);
        }
    }
}

testLogin();
