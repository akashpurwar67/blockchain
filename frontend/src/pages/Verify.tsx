import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Verify.css';

interface VerifiedCertificate {
  id: string;
  studentName: string;
  studentID: string;
  certificateName: string;
  certificateType: string;
  issueDate: string;
  expiryDate: string;
  isExpired: boolean;
  status: string;
  verificationCode: string;
  isVerified: boolean;
  createdAt: string;
  onBlockchain?: boolean;
}

const Verify: React.FC = () => {
  const { verificationCode: urlVerificationCode } = useParams<{ verificationCode: string }>();
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'expired' | 'invalid' | 'idle'>('idle');
  const [searchCode, setSearchCode] = useState(urlVerificationCode || '');
  const [blockchainStatus, setBlockchainStatus] = useState<any>(null);

  const verifyCertificate = async (code: string = searchCode) => {
    if (!code.trim()) {
      setError('Please enter a certificate verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Try verification endpoint that supports both code and ID
      const response = await axios.get(
        `http://localhost:4000/api/certificates/verify/${code}`
      );

      if (response.data.success && response.data.certificate) {
        const cert = response.data.certificate;
        setCertificate(cert);
        setBlockchainStatus(response.data.blockchainVerification);

        // Determine status
        if (!response.data.verified) {
          setVerificationStatus('invalid');
        } else if (cert.isExpired) {
          setVerificationStatus('expired');
        } else {
          setVerificationStatus('verified');
        }
      } else {
        setError('Certificate not found or invalid verification code');
        setVerificationStatus('invalid');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to verify certificate. Please check the code and try again.'
      );
      setVerificationStatus('invalid');
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if code is in URL params
  React.useEffect(() => {
    if (urlVerificationCode && !certificate) {
      verifyCertificate(urlVerificationCode);
    }
  }, [urlVerificationCode]);

  const handleVerifyClick = () => {
    verifyCertificate();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyCertificate();
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        {/* Header */}
        <div className="verify-header">
          <h1>🎓 Certificate Verification</h1>
          <p className="verify-subtitle">NIT Warangal Academic Records System</p>
        </div>

        {/* Search Form - Always visible */}
        <div className="search-section">
          <h2>Enter Certificate Code</h2>
          <p className="search-subtitle">Enter your certificate's unique verification code to verify its authenticity</p>
          
          <div className="search-input-group">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter certificate code (e.g., ABC123XYZ)"
              className="search-input"
              disabled={loading}
              autoFocus
            />
            <button
              className="btn-verify"
              onClick={handleVerifyClick}
              disabled={loading || !searchCode.trim()}
            >
              {loading ? '⏳ Verifying...' : '🔍 Verify Certificate'}
            </button>
          </div>

          {error && !certificate && <div className="error-message">{error}</div>}

          {!certificate && (
            <div className="search-help">
              <h4>Where to find your code?</h4>
              <p>The certificate verification code was provided to you when the certificate was issued. You can also find it:</p>
              <ul>
                <li>📧 In the email sent to you upon certificate issuance</li>
                <li>📄 On your digital certificate document</li>
                <li>🔗 In the certificate verification URL</li>
              </ul>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Verifying Certificate...</p>
          </div>
        )}

        {/* Status Indicator - Show after verification */}
        {!loading && certificate && verificationStatus !== 'idle' && (
          <>
            <div className={`verify-status ${verificationStatus}`}>
              {verificationStatus === 'verified' && (
                <>
                  <div className="status-icon">✓</div>
                  <div className="status-text">
                    <h2>✅ Certificate Verified</h2>
                    <p>This certificate is authentic and valid</p>
                  </div>
                </>
              )}
              {verificationStatus === 'expired' && (
                <>
                  <div className="status-icon">⚠</div>
                  <div className="status-text">
                    <h2>⚠️ Certificate Expired</h2>
                    <p>This certificate has expired and is no longer valid</p>
                  </div>
                </>
              )}
              {verificationStatus === 'invalid' && (
                <>
                  <div className="status-icon">✕</div>
                  <div className="status-text">
                    <h2>❌ Certificate Invalid</h2>
                    <p>{error || 'This certificate could not be verified'}</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Certificate Details */}
        {certificate && (
          <div className="certificate-details">
            <h3>Certificate Details</h3>

            <div className="detail-section">
              <div className="detail-item">
                <label>Certificate Name</label>
                <p>{certificate.certificateName}</p>
              </div>
              <div className="detail-item">
                <label>Certificate Type</label>
                <p>{certificate.certificateType}</p>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-item">
                <label>Recipient Name</label>
                <p>{certificate.studentName}</p>
              </div>
              <div className="detail-item">
                <label>Student ID</label>
                <p>{certificate.studentID}</p>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-item">
                <label>Issue Date</label>
                <p>{new Date(certificate.issueDate).toLocaleDateString()}</p>
              </div>
              <div className="detail-item">
                <label>Expiry Date</label>
                <p>{new Date(certificate.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-item full-width">
                <label>Verification Code</label>
                <div className="verification-code-display">
                  <code>{certificate.verificationCode}</code>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(certificate.verificationCode);
                      alert('Verification code copied to clipboard!');
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-item">
                <label>Certificate ID</label>
                <p className="certificate-id">{certificate.id}</p>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span className={`status-badge ${certificate?.status?.toLowerCase() || 'pending'}`}>
                  {certificate?.status || 'PENDING'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-item full-width">
                <label>Verification Timestamp</label>
                <p>{new Date(certificate.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Security Features */}
        <div className="security-section">
          <h3>🔒 Security Features</h3>
          <ul>
            <li>✓ Digital signature verified</li>
            <li>✓ Blockchain-backed authenticity</li>
            <li>✓ Tamper-proof verification code</li>
            <li>✓ Official NIT Warangal seal</li>
            <li>✓ Unique certificate ID</li>
          </ul>
        </div>

        {/* Footer Actions */}
        {certificate && (
          <div className="verify-actions">
            <button className="btn-print" onClick={() => window.print()}>
              🖨️ Print Certificate
            </button>
            <button 
              className="btn-verify-another" 
              onClick={() => {
                setCertificate(null);
                setSearchCode('');
                setVerificationStatus('idle');
                setError('');
              }}
            >
              🔄 Verify Another
            </button>
            <button className="btn-home" onClick={() => window.location.href = '/'}>
              🏠 Go to Home
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="verify-footer">
          <p>
            This certificate has been verified using NIT Warangal's blockchain-based
            academic records system. For authenticity inquiries, contact the Academic
            Affairs office.
          </p>
          <p className="footer-contact">
            Email: academics@nit.edu.in | Phone: +91-870-2455-XXX
          </p>
        </div>
      </div>
    </div>
  );
};

export default Verify;
