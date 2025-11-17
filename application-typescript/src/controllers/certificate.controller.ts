import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger';
import { FabricService } from '../services/fabric.service';

interface Certificate {
  id: string;
  studentID: string;
  studentName: string;
  certificateName: string;
  certificateType: string;
  certificateDescription?: string; // "This is to certify..." paragraph
  isMarksheet?: boolean; // Whether this is a marksheet certificate
  marksheetData?: {
    semester: string;
    academicYear: string;
    totalMarks?: number;
    totalMarksMax?: number;
    gpa?: number;
  };
  issueDate: string;
  expiryDate?: string;
  verificationCode: string;
  isVerified: boolean;
  createdAt: string;
  blockchainHash?: string;
  onBlockchain?: boolean;
}

export class CertificateController {
  private certificatesFile = path.join(process.cwd(), 'data', 'certificates.json');
  private fabricService: FabricService;

  constructor() {
    this.ensureDataDir();
    this.fabricService = new FabricService();
  }

  private ensureDataDir(): void {
    const dataDir = path.dirname(this.certificatesFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.certificatesFile)) {
      fs.writeFileSync(this.certificatesFile, JSON.stringify([]));
    }
  }

  private readCertificates(): Certificate[] {
    try {
      const data = fs.readFileSync(this.certificatesFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Error reading certificates file: ${error}`);
      return [];
    }
  }

  private writeCertificates(certificates: Certificate[]): void {
    try {
      fs.writeFileSync(this.certificatesFile, JSON.stringify(certificates, null, 2));
    } catch (error) {
      logger.error(`Error writing certificates file: ${error}`);
    }
  }

  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private calculateExpiryDate(issueDate: string, years: number = 3): string {
    const date = new Date(issueDate);
    date.setFullYear(date.getFullYear() + years);
    return date.toISOString().split('T')[0];
  }

  async generateCertificate(req: Request, res: Response): Promise<void> {
    try {
      const {
        studentID,
        studentName,
        certificateName,
        certificateType,
        certificateDescription, // Optional: certification paragraph
        isMarksheet = false, // Whether this is a marksheet certificate
        marksheetData, // Optional: semester and academic year for marksheet
        issueDate = new Date().toISOString().split('T')[0],
      } = req.body;

      console.log('\n' + '═'.repeat(70));
      console.log('🎓 CERTIFICATE GENERATION');
      console.log('═'.repeat(70));
      console.log(`🆔 Student ID: ${studentID}`);
      console.log(`👤 Student Name: ${studentName}`);
      console.log(`📜 Certificate Name: ${certificateName}`);
      console.log(`📋 Type: ${isMarksheet ? '📊 MARKSHEET' : certificateType}`);
      if (certificateDescription) {
        console.log(`📝 Description: ${certificateDescription.substring(0, 50)}...`);
      }
      console.log(`📅 Issue Date: ${issueDate}`);
      console.log('═'.repeat(70));

      // Validate input
      if (!studentID || !studentName || !certificateName) {
        res.status(400).json({
          error: 'Missing required fields: studentID, studentName, certificateName',
        });
        return;
      }

      // If marksheet, validate marksheet data
      if (isMarksheet) {
        if (!marksheetData) {
          res.status(400).json({
            error: 'For marksheet certificate, marksheetData is required',
          });
          return;
        }
        // For aggregate marksheet, we expect either:
        // 1. aggregateData (for full transcript/overall marksheet)
        // 2. semester and academicYear (for semester-specific marksheet)
        if (!marksheetData.aggregateData && (!marksheetData.semester || !marksheetData.academicYear)) {
          res.status(400).json({
            error: 'For marksheet certificate, either aggregateData or (semester and academicYear) is required',
          });
          return;
        }
      }

      // Generate unique certificate ID and verification code
      const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const verificationCode = this.generateVerificationCode();
      const expiryDate = this.calculateExpiryDate(issueDate);

      // Create certificate object
      const certificate: Certificate = {
        id: certificateId,
        studentID,
        studentName,
        certificateName,
        certificateType,
        certificateDescription: certificateDescription || '', // Add description
        isMarksheet, // Mark if it's a marksheet
        marksheetData: isMarksheet ? marksheetData : undefined,
        issueDate,
        expiryDate,
        verificationCode,
        isVerified: true,
        createdAt: new Date().toISOString(),
        onBlockchain: false,
      };

      // Read existing certificates
      const certificates = this.readCertificates();

      // Add new certificate
      certificates.push(certificate);

      // Write back to file
      this.writeCertificates(certificates);

      logger.info(`Certificate generated: ${certificateId} for student ${studentID}${isMarksheet ? ' (MARKSHEET)' : ''}`);

      // **BLOCKCHAIN INTEGRATION**: Submit to Hyperledger Fabric (or demo mode)
      let blockchainResult: any = null;
      let onBlockchain = false;

      try {
        // Initialize fabric service if not done
        await this.fabricService.initialize();

        // Submit to blockchain (works in both real and demo mode)
        logger.info(`Submitting certificate ${certificateId} to blockchain...`);
        
        const result = await this.fabricService.submitTransaction('IssueCertificate', [
          certificateId,
          studentID,
          certificateType,
        ]);

        blockchainResult = JSON.parse(result.toString());
        onBlockchain = true;
        certificate.onBlockchain = true;
        certificate.blockchainHash = blockchainResult.CertificateHash || certificateId;

        // Update JSON with blockchain info
        const updatedCerts = this.readCertificates();
        const certIndex = updatedCerts.findIndex(c => c.id === certificateId);
        if (certIndex !== -1) {
          updatedCerts[certIndex] = certificate;
          this.writeCertificates(updatedCerts);
        }

        const networkMode = this.fabricService.isRealConnection() ? '✅ REAL FABRIC NETWORK' : '🔐 CRYPTOGRAPHIC VERIFICATION (Demo Mode)';
        logger.info(`✅ Certificate submitted to blockchain: ${certificateId} (${networkMode})`);
      } catch (fabricError) {
        logger.warn(`Blockchain submission failed: ${fabricError}`);
        logger.warn(`Certificate available in local database. Can be submitted to blockchain later.`);
      }

      res.status(201).json({
        success: true,
        certificate,
        blockchainStatus: onBlockchain ? 'SUBMITTED' : 'PENDING_BLOCKCHAIN',
        blockchainDetails: blockchainResult || null,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify/${verificationCode}`,
        message: onBlockchain 
          ? 'Certificate created and stored on blockchain ✅' 
          : '⚠️ Certificate created locally. Blockchain network offline.',
      });

      console.log('\n✅ CERTIFICATE GENERATED SUCCESSFULLY');
      console.log(`📄 Certificate ID: ${certificateId}`);
      console.log(`🔐 Verification Code: ${verificationCode}`);
      console.log(`📅 Expiry Date: ${expiryDate}`);
      console.log(`🔗 Blockchain Status: ${onBlockchain ? 'SUBMITTED' : 'PENDING'}`);
      console.log(`🌐 Verification URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify/${verificationCode}`);
      console.log('═'.repeat(70) + '\n');
    } catch (error) {
      logger.error(`Error generating certificate: ${error}`);
      res.status(500).json({ error: 'Failed to generate certificate' });
    }
  }

  async verifyCertificate(req: Request, res: Response): Promise<void> {
    try {
      const { verificationCode } = req.params;

      console.log('\n' + '═'.repeat(70));
      console.log('🔍 CERTIFICATE VERIFICATION');
      console.log('═'.repeat(70));
      console.log(`🔐 Verification Code: ${verificationCode}`);

      if (!verificationCode) {
        res.status(400).json({ error: 'Verification code is required' });
        return;
      }

      // Read certificates
      const certificates = this.readCertificates();

      // Find certificate by verification code
      const certificate = certificates.find(
        (cert) => cert.verificationCode === verificationCode
      );

      if (!certificate) {
        console.log('\n❌ CERTIFICATE NOT FOUND');
        console.log(`Verification Code: ${verificationCode}`);
        console.log('═'.repeat(70) + '\n');
        res.status(404).json({
          success: false,
          error: 'Certificate not found',
          message: 'The provided verification code does not match any certificate',
        });
        return;
      }

      // Check if certificate is still valid (not expired)
      const isExpired = certificate.expiryDate && new Date(certificate.expiryDate) < new Date();

      console.log(`👤 Student: ${certificate.studentName} (${certificate.studentID})`);
      console.log(`📜 Certificate: ${certificate.certificateName}`);
      console.log(`📋 Type: ${certificate.certificateType}`);
      console.log(`📅 Issue Date: ${certificate.issueDate}`);
      console.log(`⏳ Expiry Date: ${certificate.expiryDate}`);
      console.log(`✓ Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);

      // **BLOCKCHAIN INTEGRATION**: Verify on blockchain (or demo mode)
      let blockchainVerified = false;
      let blockchainDetails = null;

      try {
        await this.fabricService.initialize();

        // Verify on blockchain (works in both real and demo mode)
        logger.info(`Verifying certificate ${certificate.id} on blockchain...`);
        
        const result = await this.fabricService.evaluateTransaction('VerifyCertificate', [
          certificate.id,
          certificate.blockchainHash || certificate.id,
        ]);

        const parsed = JSON.parse(result.toString());
        blockchainVerified = parsed.verified === true;
        blockchainDetails = parsed;

        const networkMode = this.fabricService.isRealConnection() ? '✅ REAL FABRIC NETWORK' : '🔐 CRYPTOGRAPHIC VERIFICATION (Demo Mode)';
        logger.info(`✅ Blockchain verification result: ${blockchainVerified} (${networkMode})`);
      } catch (fabricError) {
        logger.warn(`Blockchain verification failed: ${fabricError}`);
        logger.warn(`Falling back to local database verification`);
      }

      console.log(`\n🔗 Blockchain Verification: ${blockchainVerified ? '✅ VERIFIED' : '⚠️ PENDING'}`);
      console.log('═'.repeat(70));
      console.log('\n✅ CERTIFICATE VERIFIED SUCCESSFULLY');
      console.log('═'.repeat(70) + '\n');

      res.status(200).json({
        success: true,
        verified: true,
        certificate: {
          id: certificate.id,
          studentName: certificate.studentName,
          studentID: certificate.studentID,
          certificateName: certificate.certificateName,
          certificateType: certificate.certificateType,
          issueDate: certificate.issueDate,
          expiryDate: certificate.expiryDate,
          isExpired,
          status: isExpired ? 'EXPIRED' : 'VALID',
          verificationCode: certificate.verificationCode,
          isVerified: certificate.isVerified,
          createdAt: certificate.createdAt,
          onBlockchain: certificate.onBlockchain || false,
        },
        blockchainVerification: {
          verified: blockchainVerified,
          network: this.fabricService.isRealConnection() ? 'ACTIVE' : 'OFFLINE',
          details: blockchainDetails,
        },
      });
    } catch (error) {
      logger.error(`Error verifying certificate: ${error}`);
      res.status(500).json({ error: 'Failed to verify certificate' });
    }
  }

  async getCertificate(req: Request, res: Response): Promise<void> {
    try {
      const { certificateId } = req.params;

      if (!certificateId) {
        res.status(400).json({ error: 'Certificate ID is required' });
        return;
      }

      const certificates = this.readCertificates();
      const certificate = certificates.find((cert) => cert.id === certificateId);

      if (!certificate) {
        res.status(404).json({ error: 'Certificate not found' });
        return;
      }

      res.status(200).json({
        success: true,
        certificate,
      });
    } catch (error) {
      logger.error(`Error fetching certificate: ${error}`);
      res.status(500).json({ error: 'Failed to fetch certificate' });
    }
  }

  async getStudentCertificates(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      const certificates = this.readCertificates();
      const studentCertificates = certificates.filter(
        (cert) => cert.studentID === studentId
      );

      res.status(200).json({
        success: true,
        count: studentCertificates.length,
        certificates: studentCertificates,
      });
    } catch (error) {
      logger.error(`Error fetching student certificates: ${error}`);
      res.status(500).json({ error: 'Failed to fetch certificates' });
    }
  }
}
