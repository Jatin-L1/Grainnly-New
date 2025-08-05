# Grainlyy - Blockchain-Based Public Distribution Tracker

<p align="center">
  
![Grainlyy Logo](https://github.com/user-attachments/assets/d6d0533e-1b26-42f5-8c2b-9b3450e84f15)
</p>


Grainlyy is a blockchain-based system designed to make government ration delivery systems transparent, tamper-proof, and publicly verifiable.

## 📋 Problem Statement

The current public distribution systems face several critical challenges:

- **Corruption** in the ration delivery process
- **Fake delivery entries** created by unscrupulous dealers
- **Lack of transparency** - the public has no reliable way to verify if deliveries were actually completed
- **No accountability** for distributors who fail to deliver as promised

## 🚀 Solution

Grainlyy creates an end-to-end transparent supply chain for public distribution systems:

- **Blockchain-verified assignments**: Government assigns ration deliveries through immutable blockchain records
- **Location-verified deliveries**: Dealers complete deliveries with real-time location verification
- **Public verification**: Citizens and NGOs can transparently track the entire delivery process
- **Trust scoring**: Automatic rating system for dealers based on delivery performance

## ✨ Key Features

- **Immutable delivery records** stored on blockchain
- **Real-time Location verification** of delivery locations
- **Trust score system** for dealers
- **Multiple dashboards** for different stakeholders
- **No mobile app required** - works directly in web browsers
- **Complaint management system** for beneficiaries

## 🧱 Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contract | Solidity + Foundry | To assign deliveries, mark completion, and store logs on-chain |
| Oracle Layer | Chainlink Functions | To verify real-world GPS locations on the blockchain |
| Wallet | Inbuilt/Metamask | For login and secure transactions |
| Frontend | Next.js | To build interactive dashboards for users |
| Backend | Node.js + Express.js | To manage location data, Chainlink calls, and frontend connectivity |
| Blockchain | Etherium  | For fast and low-cost transactions |
| Database (Optional) | MongoDB Atlas | For off-chain storage like complaints and analytics |
| Storage (Optional) | IPFS | For decentralized storage of documents and images |

## 🏗️ Architecture

### Blockchain Flow

1. **Smart Contract (Delivery.sol)**
   - Government assigns deliveries to dealers
   - Dealers complete deliveries after successful GPS verification
   - Delivery records are permanently and immutably stored on the blockchain

2. **Chainlink Functions**
   - Dealer's browser collects current (latitude/longitude)
   - Backend sends Location data to Chainlink Functions for validation
   - Chainlink verifies whether the delivery occurred at the correct location

3. **Trust Score System**
   - Each dealer maintains a trust score
   - Successful deliveries improve trust score
   - False or incorrect deliveries reduce trust score

### Location Verification

- Uses browser's `navigator.geolocation.getCurrentPosition()` API
- No mobile app required - works directly in web browsers
- Location validation done via Chainlink Functions or OpenStreetMap
- No dependency on Google Maps API, making it cost-efficient

### End-to-End Process Flow

1. Government assigns delivery tasks via the dashboard
2. Dealer logs in through wallet (MetaMask) on the dealer dashboard
3. Dealer views assigned delivery tasks
4. Dealer clicks "Mark as Delivered" and grants GPS location access
5. Backend verifies GPS coordinates:
   - If correct → Delivery is marked complete on the blockchain
   - If incorrect → Delivery is rejected; no payment processed
6. Public and NGOs can transparently track all delivery records through the public dashboard

## 🚦 Getting Started

### Prerequisites

- Node.js 16+
- MetaMask wallet extension
- Internet connection (for GPS functionality)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Grainlyy.git
   cd Grainlyy
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your configuration.

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📊 Project Status

This project is currently in development. Features being worked on:

- [ ] Smart contract implementation
- [ ] GPS verification through Chainlink
- [ ] Admin dashboard
- [ ] Dealer interface
- [ ] Public verification portal

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Contact

For questions or suggestions, please reach out to [jatinsharmasm2435@gmail.com](jatinsharmasm2435@gmail.com).

---

Built with ❤️ for transparency and accountability grainlyy.
