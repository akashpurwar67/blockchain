import {
  Wallets,
  Gateway,
  Contract,
  Network,
  X509Identity,
} from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';
import logger from '../config/logger';

/**
 * Real Hyperledger Fabric Service
 * Connects to actual Fabric network (test-network)
 */
export class FabricRealService {
  private gateway: Gateway | null = null;
  private contract: Contract | null = null;
  private mspID: string;
  private isConnected: boolean = false;
  private wallet: any = null;

  constructor(mspID: string = 'Org1MSP') {
    this.mspID = mspID;
  }

  /**
   * Initialize real connection to Fabric network
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔗 Initializing real Hyperledger Fabric connection...');

      // Create wallet and load identities
      this.wallet = await Wallets.newFileSystemWallet('./wallet');
      
      // Check if admin identity exists
      const adminIdentity = await this.wallet.get(`${this.mspID}-admin`);
      if (!adminIdentity) {
        logger.warn(`Admin identity not found for ${this.mspID}`);
        logger.info('Attempting to load identities from fabric-samples...');
        await this.loadIdentitiesFromFabricSamples();
      }

      // Build connection profile path
      const connectionProfilePath = path.resolve(
        __dirname,
        '../../profiles/connection-profile-org1.json'
      );

      if (!fs.existsSync(connectionProfilePath)) {
        throw new Error(`Connection profile not found at ${connectionProfilePath}`);
      }

      // Load and parse connection profile
      const connectionProfile = JSON.parse(
        fs.readFileSync(connectionProfilePath, 'utf8')
      );

      // Replace placeholders in connection profile
      const fabricSamplesPath = path.resolve(
        __dirname,
        '../../fabric-samples'
      );
      const profileStr = JSON.stringify(connectionProfile)
        .replace(/{{ FABRIC_SAMPLES }}/g, fabricSamplesPath);
      const resolvedProfile = JSON.parse(profileStr);

      // Create gateway
      const gateway = new Gateway();

      // Get admin identity
      const identity = await this.wallet.get(`${this.mspID}-admin`);
      if (!identity) {
        throw new Error(`Identity ${this.mspID}-admin not found in wallet`);
      }

      // Connect to gateway
      await gateway.connect(resolvedProfile, {
        wallet: this.wallet,
        identity: `${this.mspID}-admin`,
        discovery: { enabled: true, asLocalhost: true },
      });

      this.gateway = gateway;
      this.isConnected = true;
      logger.info(`✅ Connected to Hyperledger Fabric as ${this.mspID}`);

      // Get contract
      await this.getContract();
      logger.info('✅ Contract loaded and ready for transactions');
    } catch (error) {
      logger.error(`Failed to initialize Fabric connection: ${error}`);
      throw error;
    }
  }

  /**
   * Load identities from fabric-samples test-network
   */
  private async loadIdentitiesFromFabricSamples(): Promise<void> {
    try {
      const testNetworkPath = path.resolve(
        __dirname,
        '../../fabric-samples/test-network'
      );

      // Load Org1 admin
      await this.loadIdentity(
        'Org1MSP',
        path.join(
          testNetworkPath,
          'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com'
        )
      );

      // Load Org2 admin
      await this.loadIdentity(
        'Org2MSP',
        path.join(
          testNetworkPath,
          'organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com'
        )
      );

      logger.info('✅ Identities loaded from fabric-samples');
    } catch (error) {
      logger.warn(`Could not load identities from fabric-samples: ${error}`);
    }
  }

  /**
   * Load a single identity into wallet
   */
  private async loadIdentity(mspID: string, identityPath: string): Promise<void> {
    try {
      const certPath = path.join(identityPath, 'msp/signcerts');
      const keyPath = path.join(identityPath, 'msp/keystore');

      // Find cert file
      const certFiles = fs.readdirSync(certPath);
      const certFile = certFiles.find((f) => f.endsWith('-cert.pem'));
      if (!certFile) throw new Error('Certificate file not found');

      // Find key file
      const keyFiles = fs.readdirSync(keyPath);
      const keyFile = keyFiles.find((f) => f.endsWith('_sk'));
      if (!keyFile) throw new Error('Private key file not found');

      // Read cert and key
      const certificatePEM = fs.readFileSync(
        path.join(certPath, certFile),
        'utf8'
      );
      const privateKeyPEM = fs.readFileSync(
        path.join(keyPath, keyFile),
        'utf8'
      );

      // Create and store identity
      const identity: X509Identity = {
        credentials: {
          certificate: certificatePEM,
          privateKey: privateKeyPEM,
        },
        mspId: mspID,
        type: 'X.509',
      };

      await this.wallet.put(`${mspID}-admin`, identity);
      logger.info(`✅ Loaded identity: ${mspID}-admin`);
    } catch (error) {
      logger.warn(`Could not load identity for ${mspID}: ${error}`);
    }
  }

  /**
   * Get contract for chaincode interactions
   */
  async getContract(): Promise<Contract> {
    if (!this.gateway) {
      throw new Error('Gateway not initialized. Call initialize() first.');
    }

    if (!this.contract) {
      const network: Network = await this.gateway.getNetwork('mychannel');
      this.contract = network.getContract('academic-records');
    }

    return this.contract;
  }

  /**
   * Submit transaction to chaincode
   */
  async submitTransaction(
    functionName: string,
    args: string[]
  ): Promise<Buffer> {
    try {
      const contract = await this.getContract();

      logger.info(
        `🔗 Submitting transaction: ${functionName}(${args.join(', ')})`
      );

      const result = await contract.submitTransaction(functionName, ...args);

      logger.info(`✅ Transaction ${functionName} recorded on blockchain`);
      logger.info(`Transaction result: ${result.toString()}`);

      return result;
    } catch (error) {
      logger.error(`Transaction failed: ${error}`);
      throw error;
    }
  }

  /**
   * Evaluate transaction (read-only)
   */
  async evaluateTransaction(
    functionName: string,
    args: string[]
  ): Promise<Buffer> {
    try {
      const contract = await this.getContract();

      logger.info(
        `🔗 Evaluating transaction: ${functionName}(${args.join(', ')})`
      );

      const result = await contract.evaluateTransaction(functionName, ...args);

      logger.info(`✅ Query executed successfully`);
      logger.info(`Query result: ${result.toString()}`);

      return result;
    } catch (error) {
      logger.error(`Query failed: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnect from network
   */
  async disconnect(): Promise<void> {
    if (this.gateway) {
      await this.gateway.disconnect();
      logger.info('Disconnected from Hyperledger Fabric');
    }
  }

  /**
   * Check connection status
   */
  getConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status message
   */
  getStatus(): string {
    return this.isConnected
      ? `Connected to Hyperledger Fabric (${this.mspID})`
      : 'Not connected to Hyperledger Fabric';
  }
}
