#!/usr/bin/env node
/**
 * Generate Vincent AI Compatible Keys
 * Creates a new Ethereum wallet for use with Vincent AI/Lit Protocol
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

console.log('🔑 Generating Vincent AI Compatible Keys...\n');

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

// Extract the required values
const privateKey = wallet.privateKey;
const address = wallet.address;
const publicKey = wallet.publicKey;

console.log('✅ Keys Generated Successfully!\n');
console.log('==================================');
console.log('🔐 VINCENT_DELEGATEE_PRIVATE_KEY:');
console.log(privateKey);
console.log('\n📍 VINCENT_DELEGATEE_ADDRESS:'); 
console.log(address);
console.log('\n🔑 Public Key (for reference):');
console.log(publicKey);
console.log('==================================\n');

console.log('📋 Copy these values to your .env.production file:');
console.log(`VINCENT_DELEGATEE_PRIVATE_KEY=${privateKey}`);
console.log(`VINCENT_DELEGATEE_ADDRESS=${address}`);
console.log('\n⚠️  SECURITY WARNING:');
console.log('- Keep your private key secret and secure');
console.log('- Never share it or commit it to git');
console.log('- This wallet will control your trading permissions');

console.log('\n🚀 Next Steps:');
console.log('1. Copy the keys to your .env.production file');
console.log('2. Fund this address with a small amount of ETH for gas fees');
console.log('3. Configure Vincent AI to use this PKP for trading');

// Generate a simple backup file
const backup = {
  timestamp: new Date().toISOString(),
  purpose: 'Vincent AI Trading Bot - Hackathon Competition',
  keys: {
    privateKey,
    address,
    publicKey
  },
  warning: 'Keep this file secure and never share the private key'
};

const backupFile = `vincent-keys-backup-${Date.now()}.json`;
require('fs').writeFileSync(backupFile, JSON.stringify(backup, null, 2));
console.log(`\n💾 Backup saved to: ${backupFile}`);
console.log('🔒 Store this backup file in a secure location!\n');

console.log('🎯 Ready for Vincent AI integration!');