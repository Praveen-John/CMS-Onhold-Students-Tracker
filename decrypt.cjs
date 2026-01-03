#!/usr/bin/env node

/**
 * Manual Decryption Tool for CMS Tracker
 *
 * This script decrypts AES-256-GCM encrypted values from the database.
 *
 * Usage:
 *   node decrypt.js "iv:authTag:encryptedData"
 *
 * Example:
 *   node decrypt.js "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:q1w2e3r4t5y6u7i8o9p0l1k2j3h4g5f:m3n4o5p6q7r8s9t0u1v2w3x4y5z6..."
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const ALGORITHM = 'aes-256-gcm';

// Load encryption key from .env file
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Error: .env file not found');
        console.error('Please create a .env file with ENCRYPTION_KEY variable');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};

    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });

    return env;
}

// Decrypt text using AES-256-GCM
function decryptText(encryptedData, encryptionKey) {
    if (!encryptedData) return '';
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            console.error('❌ Invalid encrypted data format');
            console.error('Expected format: iv:authTag:encryptedData');
            console.error(`Got: ${encryptedData.substring(0, 50)}...`);
            return null;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const key = Buffer.from(encryptionKey.slice(0, 64), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('❌ Decryption error:', error.message);
        return null;
    }
}

// Main execution
function main() {
    console.log('🔐 CMS Tracker Decryption Tool\n');

    // Load environment
    const env = loadEnv();

    if (!env.ENCRYPTION_KEY) {
        console.error('❌ Error: ENCRYPTION_KEY not found in .env file');
        process.exit(1);
    }

    // Get encrypted data from command line argument
    const encryptedData = process.argv[2];

    if (!encryptedData) {
        console.log('Usage: node decrypt.js "iv:authTag:encryptedData"\n');
        console.log('Example:');
        console.log('  node decrypt.js "a1b2c3d4e5f6g7h8:q1w2e3r4t5y6u7i8:m3n4o5p6q7r8s9t0"\n');
        console.log('You can find encrypted data in MongoDB:');
        console.log('  db.students.findOne({}, {phoneNumber: 1, registeredMailId: 1})');
        process.exit(0);
    }

    // Decrypt
    console.log('📥 Encrypted input:');
    console.log(`  ${encryptedData.substring(0, 100)}${encryptedData.length > 100 ? '...' : ''}\n`);

    const decrypted = decryptText(encryptedData, env.ENCRYPTION_KEY);

    if (decrypted !== null) {
        console.log('✅ Decrypted output:');
        console.log(`  ${decrypted}\n`);
        console.log('✅ Success!');
    } else {
        console.log('\n❌ Decryption failed');
        console.log('\nPossible reasons:');
        console.log('  - Wrong encryption key');
        console.log('  - Corrupted data');
        console.log('  - Invalid format');
        process.exit(1);
    }
}

// Run
main();
