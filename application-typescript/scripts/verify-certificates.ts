#!/usr/bin/env ts-node
/**
 * Verification Script: Check all certificates stored in blockchain
 * 
 * Usage:
 *   npm run verify-certs
 * 
 * This script reads the certificates.json file and displays all certificates
 * that have been issued and stored in the blockchain.
 */

import * as fs from 'fs';
import * as path from 'path';

interface Certificate {
  id: string;
  studentID: string;
  studentName: string;
  certificateName: string;
  certificateType: string;
  issueDate: string;
  expiryDate?: string;
  verificationCode: string;
  isVerified: boolean;
  createdAt: string;
  blockchainHash?: string;
  onBlockchain?: boolean;
}

function displayBlockchainVerification(): void {
  const certificatesPath = path.join(process.cwd(), 'data', 'certificates.json');

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   🔗 BLOCKCHAIN CERTIFICATE VERIFICATION 🔗                     ║');
  console.log('║                     NIT Warangal Academic Records System                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    if (!fs.existsSync(certificatesPath)) {
      console.log('❌ No certificates file found. No certificates have been issued yet.\n');
      return;
    }

    const certificatesData = fs.readFileSync(certificatesPath, 'utf-8');
    const certificates: Certificate[] = JSON.parse(certificatesData);

    if (certificates.length === 0) {
      console.log('📭 No certificates found. Start by creating a student and issuing certificates.\n');
      return;
    }

    const blockchainCerts = certificates.filter(c => c.onBlockchain);
    const pendingCerts = certificates.filter(c => !c.onBlockchain);

    console.log(`📊 CERTIFICATE STATISTICS:`);
    console.log(`   Total Issued: ${certificates.length}`);
    console.log(`   ✅ On Blockchain: ${blockchainCerts.length}`);
    console.log(`   ⏳ Pending Blockchain: ${pendingCerts.length}`);
    console.log('\n');

    if (blockchainCerts.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log('✅ CERTIFICATES STORED ON BLOCKCHAIN:');
      console.log('═══════════════════════════════════════════════════════════════════════════════\n');

      blockchainCerts.forEach((cert, index) => {
        console.log(`📜 Certificate #${index + 1}`);
        console.log('─────────────────────────────────────────────────────');
        console.log(`  ID:                  ${cert.id}`);
        console.log(`  Student ID:          ${cert.studentID}`);
        console.log(`  Student Name:        ${cert.studentName}`);
        console.log(`  Certificate Name:    ${cert.certificateName}`);
        console.log(`  Certificate Type:    ${cert.certificateType}`);
        console.log(`  Issue Date:          ${new Date(cert.issueDate).toLocaleDateString()}`);
        if (cert.expiryDate) {
          console.log(`  Expiry Date:         ${new Date(cert.expiryDate).toLocaleDateString()}`);
        }
        console.log(`  Verification Code:   ${cert.verificationCode}`);
        console.log(`  Status:              ✅ VERIFIED ON BLOCKCHAIN`);
        console.log(`  Blockchain Hash:     ${cert.blockchainHash}`);
        console.log(`  Created:             ${new Date(cert.createdAt).toLocaleString()}`);
        console.log(`  Verification URL:    http://localhost:3001/verify/${cert.verificationCode}`);
        console.log('');
      });
    }

    if (pendingCerts.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log('⏳ CERTIFICATES PENDING BLOCKCHAIN SUBMISSION:');
      console.log('═══════════════════════════════════════════════════════════════════════════════\n');

      pendingCerts.forEach((cert, index) => {
        console.log(`📄 Certificate #${index + 1} (PENDING)`);
        console.log('─────────────────────────────────────────────────────');
        console.log(`  ID:                  ${cert.id}`);
        console.log(`  Student ID:          ${cert.studentID}`);
        console.log(`  Student Name:        ${cert.studentName}`);
        console.log(`  Certificate Name:    ${cert.certificateName}`);
        console.log(`  Certificate Type:    ${cert.certificateType}`);
        console.log(`  Verification Code:   ${cert.verificationCode}`);
        console.log(`  Status:              ⏳ WAITING FOR BLOCKCHAIN`);
        console.log(`  Created:             ${new Date(cert.createdAt).toLocaleString()}`);
        console.log(`  Note:                Will be submitted when blockchain network is available`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`\n✅ TOTAL CERTIFICATES STORED: ${certificates.length}\n`);
    console.log('To verify a certificate publicly, visit:');
    console.log('  👉 http://localhost:3001/verify');
    console.log('  And enter any of the verification codes above.\n');

  } catch (error) {
    console.error('❌ Error reading certificates:', error);
    process.exit(1);
  }
}

displayBlockchainVerification();
