# Academic Records REST API

TypeScript/Node.js REST API server for the NIT Warangal Academic Records Blockchain System.

## 📚 Overview

This API provides RESTful endpoints for interacting with the Hyperledger Fabric smart contract. It handles:

- **Student Management**: Create, read, update, and delete student records
- **Academic Records**: Submit, approve, and verify semester grades
- **Certificates**: Issue and verify graduation certificates
- **Authentication**: JWT-based access control with organization-aware authorization
- **Audit Logging**: Track all transactions and state changes

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Hyperledger Fabric network running (orderer + peers)
- Fabric wallet with user identities

### Installation

```bash
npm install
```

### Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
PORT=3000
FABRIC_MSP_ID=NITWarangalMSP
FABRIC_CHANNEL=academic-records-channel
FABRIC_CHAINCODE=academic-records
JWT_SECRET=your-super-secret-key
```

### Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## 📖 API Endpoints

### Student Management

```
POST   /api/students              - Create student (NITWarangal only)
GET    /api/students              - Get all students
GET    /api/students/:studentId   - Get specific student
PUT    /api/students/:studentId   - Update student (NITWarangal only)
PATCH  /api/students/:studentId/status - Update student status
```

### Academic Records

```
POST   /api/records                      - Submit record (Departments only)
GET    /api/records/:recordId            - Get record details
GET    /api/records/student/:studentId   - Get student's records
PUT    /api/records/:recordId/approve    - Approve record (NITWarangal only)
PUT    /api/records/:recordId/verify     - Verify record (Verifiers only)
```

### Certificates

```
POST   /api/certificates              - Issue certificate (NITWarangal only)
GET    /api/certificates/:certificateId - Get certificate
POST   /api/certificates/verify       - Verify certificate (PUBLIC)
GET    /api/certificates/student/:studentId - Get student's certificates
```

### Utilities

```
GET    /health                    - API health check
POST   /auth/login                - Get JWT token
GET    /audit/:recordId           - Get audit trail
```

## 🔐 Authentication

All endpoints require JWT token except `/health` and `/api/certificates/verify`:

```bash
# Get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","mspID":"NITWarangalMSP","password":"password"}'

# Use token
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/students
```

## 📁 Project Structure

```
src/
├── index.ts                 - Express server entry point
├── config/
│   ├── config.ts           - Environment configuration
│   └── logger.ts           - Winston logging setup
├── services/
│   └── fabric.service.ts   - Fabric SDK wrapper
├── controllers/
│   ├── student.controller.ts
│   └── (other controllers)
├── routes/
│   ├── student.routes.ts
│   └── (other routes)
└── middleware/
    ├── auth.middleware.ts  - JWT verification
    └── organization.middleware.ts - Org-based access control
```

## 🧪 Testing

### Test via cURL

```bash
# Health check
curl http://localhost:3000/health

# Create student (requires token)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","mspID":"NITWarangalMSP","password":"pwd"}' \
  | jq -r '.token')

curl -X POST http://localhost:3000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"STU001","name":"John","email":"john@nit.edu","department":"CSE"}'
```

### Test via Postman

1. Import `docs/postman-collection.json`
2. Set environment variables (base URL, token)
3. Run requests from collection

## 📊 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3000 |
| `HOST` | Server host | localhost |
| `FABRIC_CHANNEL` | Fabric channel name | academic-records-channel |
| `FABRIC_CHAINCODE` | Smart contract name | academic-records |
| `FABRIC_MSP_ID` | Organization MSP ID | NITWarangalMSP |
| `FABRIC_WALLET_PATH` | Path to wallet directory | ./wallet |
| `FABRIC_CONNECTION_PATH` | Path to connection profile | ./config/connection-profile.json |
| `JWT_SECRET` | JWT signing secret | (change in production) |
| `JWT_EXPIRES_IN` | Token expiration time | 24h |
| `CORS_ORIGIN` | Allowed CORS origins | http://localhost:3001 |
| `LOG_LEVEL` | Logging level | info |

## 🐛 Troubleshooting

### Cannot connect to Fabric network

- Verify orderer and peers are running: `docker ps`
- Check connection profile paths in `.env`
- Verify wallet contains user identities
- Check Fabric logs: `docker logs peer0.nit.edu`

### Authentication failures

- Verify JWT_SECRET matches token generation
- Check token hasn't expired
- Verify MSP ID matches organization in network
- Check user permissions for operation

### Chaincode errors

- Verify chaincode is installed: `peer lifecycle chaincode queryinstalled`
- Verify chaincode is committed: `peer lifecycle chaincode querycommitted`
- Check chaincode logs: `docker logs peer0.nit.edu` and look for chaincode container logs
- Verify input parameters match chaincode function signature

## 📚 Documentation

- [API Reference](../docs/API_REFERENCE.md) - Detailed endpoint documentation
- [Architecture](../docs/ARCHITECTURE.md) - System architecture and design
- [Setup Guide](../docs/SETUP_GUIDE.md) - Complete setup instructions
- [Quick Reference](../docs/QUICK_REFERENCE.md) - Common commands

## 🔒 Security Considerations

- Change `JWT_SECRET` to strong random value in production
- Use HTTPS in production (enable TLS)
- Implement rate limiting for API endpoints
- Store credentials securely (use environment variables)
- Validate all input data
- Log security events
- Implement backup and disaster recovery
- Regular security audits

## 📜 License

Apache License 2.0

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

---

**Version**: 1.0.0  
**Last Updated**: November 2025
