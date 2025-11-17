# 🎓 NIT Warangal Academic Records System - RUN ME

## Quick Start (Copy & Paste)

All services start **without killing existing processes** using `nohup`:

```bash
bash run_all.sh
```

This starts:
- ✅ **Backend API** on `http://localhost:4000`
- ✅ **Frontend** on `http://localhost:3001`
- ✅ **Blockchain** (Hyperledger Fabric)

**Logs** are written to `/logs/` directory.

## Access the System

1. Open: **http://localhost:3001**
2. Login with: `admin` / `admin`
3. Create academic records and certificates

## System Architecture

### Frontend
- **Framework**: React 18
- **Port**: 3001
- **API Base**: `http://localhost:4000`

### Backend API
- **Framework**: Node.js/Express + TypeScript
- **Port**: 4000
- **Health Check**: `curl http://localhost:4000/health`

### Blockchain (Hyperledger Fabric)
- **Organizations**: 3 (NITWarangalMSP, StudentsMSP, VerifiersMSP)
- **Peers**: 5 (distributed across orgs)
- **Orderer**: 1
- **Chaincode**: `academic-records` (Go) — handles certificate issuance & verification
- **Crypto Materials**: `network/organizations/` or `crypto-config/`
- **Docker Compose**: `docker-compose-dev.yaml`

### Key Files
```
nit-warangal-network/
├── application-typescript/     # Backend API (Node/Express/TypeScript)
├── frontend/                   # React frontend
├── chaincode/                  # Hyperledger Fabric chaincode (Go)
├── network/                    # Fabric network config & orgs
├── docker-compose-dev.yaml     # Fabric containers
├── run_all.sh                  # Main startup script (USE THIS)
├── RUN_ME.md                   # This file
└── HYPERLEDGER_OVERVIEW.md     # Detailed Fabric topology
```

## Useful Commands

### Verify Services Running
```bash
# Frontend
curl -I http://localhost:3001

# Backend
curl http://localhost:4000/health

# Backend Login (test)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{"userId":"admin","password":"admin","mspID":"NITWarangalMSP"}'
```

### Stop Services
```bash
# Stop all services
killall npm node react-scripts ts-node

# Or specific port
lsof -ti:3001 | xargs kill -9  # Frontend
lsof -ti:4000 | xargs kill -9  # Backend
```

### View Logs
```bash
tail -f logs/backend.log      # Backend
tail -f logs/frontend.log     # Frontend
tail -f logs/blockchain.log   # Blockchain
```

### Docker (Blockchain)
```bash
# See running containers
docker ps --format "table {{.Names}}	{{.Image}}	{{.Status}}"

# Tail peer logs
docker logs -f peer0.org1.example.com

# Stop Fabric network
docker-compose -f docker-compose-dev.yaml down
```

## Features

✅ **Student Management** — Add/view students  
✅ **Academic Records** — Store semester-wise marks & GPA  
✅ **Certificate Generation** — Create marksheet certificates  
✅ **Aggregate Data** — View cumulative stats across all semesters  
✅ **Blockchain Verification** — All certificates cryptographically verified on Hyperledger Fabric  

## Troubleshooting

**Port Already in Use?**
```bash
lsof -ti:3001 | xargs kill -9  # Free port 3001
lsof -ti:4000 | xargs kill -9  # Free port 4000
```

**Frontend Can't Call Backend?**
- Check `http://localhost:4000/health` is responding
- Verify `.env` in `frontend/` has `REACT_APP_API_URL=http://localhost:4000`

**Blockchain Issues?**
- Check Docker is running: `docker ps`
- View logs: `tail -f logs/blockchain.log`
- See `HYPERLEDGER_OVERVIEW.md` for detailed Fabric info

## Project Structure Summary

```
Academic Records System
├── Backend (Node/Express) — API, auth, database
├── Frontend (React) — UI for students & admins
├── Blockchain (Hyperledger Fabric) — Cryptographic certificate verification
└── Hyperledger Fabric Network
    ├── 3 Organizations (NITWarangalMSP, StudentsMSP, VerifiersMSP)
    ├── 5 Peers (distributed)
    ├── 1 Orderer (transaction ordering)
    ├── Chaincode (academic-records)
    └── Crypto Config (network/organizations/)
```

---

**Ready?** Run: `bash run_all.sh`  
Then open: **http://localhost:3001**
