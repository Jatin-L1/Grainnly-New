// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../interfaces/IDCVToken.sol";

contract PaymentFacet {
    
    // Events
    event PaymentInitiated(uint256 indexed paymentId, uint256 indexed aadhaar, uint256 indexed tokenId, uint256 amount);
    event PaymentCompleted(uint256 indexed paymentId, string upiTransactionId);
    event PaymentFailed(uint256 indexed paymentId, string reason);
    event InvoiceGenerated(uint256 indexed invoiceId, uint256 indexed paymentId, string invoiceHash);
    event SubsidyApplied(uint256 indexed aadhaar, uint256 subsidyAmount);
    event PaymentConfigUpdated(string category, uint256 price, uint256 subsidyPercentage);
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier whenNotPaused() {
        require(!LibAppStorage.appStorage().paused, "System paused");
        _;
    }
    
    modifier onlyShopkeeper() {
        require(LibAppStorage.appStorage().shopkeepers_[msg.sender], "Not a shopkeeper");
        _;
    }
    
    modifier validAadhaar(uint256 aadhaar) {
        require(aadhaar >= 100000000000 && aadhaar <= 999999999999, "Invalid Aadhaar");
        _;
    }
    
    modifier paymentSystemEnabled() {
        require(LibAppStorage.appStorage().paymentSystemEnabled, "Payment system disabled");
        _;
    }
    
    // ============ PAYMENT CONFIGURATION ============
    
    function enablePaymentSystem() external onlyOwner {
        LibAppStorage.appStorage().paymentSystemEnabled = true;
        _logActivity("PAYMENT_SYSTEM_ENABLED", 0, 0, "Payment system activated");
    }
    
    function disablePaymentSystem() external onlyOwner {
        LibAppStorage.appStorage().paymentSystemEnabled = false;
        _logActivity("PAYMENT_SYSTEM_DISABLED", 0, 0, "Payment system deactivated");
    }
    
    function setRationPrice(string memory category, uint256 pricePerKg) external onlyOwner {
        require(pricePerKg > 0, "Price must be greater than 0");
        LibAppStorage.appStorage().rationPrices[category] = pricePerKg;
        _logActivity("RATION_PRICE_SET", 0, 0, string(abi.encodePacked("Price set for ", category, ": ", _toString(pricePerKg))));
    }
    
    function setSubsidyPercentage(uint256 percentage) external onlyOwner {
        require(percentage <= 100, "Subsidy cannot exceed 100%");
        LibAppStorage.appStorage().subsidyPercentage = percentage;
        _logActivity("SUBSIDY_UPDATED", 0, 0, string(abi.encodePacked("Subsidy set to ", _toString(percentage), "%")));
        emit PaymentConfigUpdated("ALL", 0, percentage);
    }
    
    function getRationPrice(string memory category) external view returns (uint256) {
        return LibAppStorage.appStorage().rationPrices[category];
    }
    
    function getSubsidyPercentage() external view returns (uint256) {
        return LibAppStorage.appStorage().subsidyPercentage;
    }
    
    // ============ PAYMENT PROCESSING ============
    
    function calculatePaymentAmount(uint256 aadhaar, uint256 tokenId) external view returns (
        uint256 totalAmount,
        uint256 subsidyAmount,
        uint256 payableAmount
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        IDCVToken.RationTokenData memory tokenData = IDCVToken(s.dcvTokenAddress).getTokenData(tokenId);
        require(tokenData.aadhaar == aadhaar, "Token not for this consumer");
        
        string memory category = s.consumers[aadhaar].category;
        uint256 pricePerKg = s.rationPrices[category];
        uint256 rationAmountKg = tokenData.rationAmount;
        
        totalAmount = (pricePerKg * rationAmountKg) / 1000; // Convert grams to kg
        subsidyAmount = (totalAmount * s.subsidyPercentage) / 100;
        payableAmount = totalAmount - subsidyAmount;
    }
    
    function initiatePayment(
        uint256 aadhaar,
        uint256 tokenId,
        string memory paymentMethod
    ) external onlyShopkeeper whenNotPaused paymentSystemEnabled validAadhaar(aadhaar) returns (uint256 paymentId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        require(s.consumers[aadhaar].assignedShopkeeper == msg.sender, "Not assigned shopkeeper");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        require(dcvToken.tokenExists(tokenId), "Token does not exist");
        require(!dcvToken.isTokenExpired(tokenId), "Token has expired");
        
        IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        require(tokenData.aadhaar == aadhaar, "Token mismatch");
        require(!tokenData.isClaimed, "Token already claimed");
        require(s.deliveryLogs[tokenId][aadhaar], "Delivery not marked");
        
        // Calculate payment amount
        (, uint256 subsidyAmount, uint256 payableAmount) = this.calculatePaymentAmount(aadhaar, tokenId);
        
        // Create payment record
        paymentId = ++s.nextPaymentId;
        
        s.payments[paymentId] = LibAppStorage.PaymentRecord({
            paymentId: paymentId,
            aadhaar: aadhaar,
            tokenId: tokenId,
            shopkeeper: msg.sender,
            amount: payableAmount,
            upiTransactionId: "",
            paymentMethod: paymentMethod,
            timestamp: block.timestamp,
            isVerified: false,
            invoiceHash: ""
        });
        
        // Update mappings
        s.tokenPayments[tokenId].push(paymentId);
        s.consumerPayments[aadhaar].push(paymentId);
        s.shopkeeperPayments[msg.sender].push(paymentId);
        
        _logActivity("PAYMENT_INITIATED", aadhaar, tokenId, string(abi.encodePacked("Payment ", _toString(paymentId), " initiated for ", _toString(payableAmount))));
        emit PaymentInitiated(paymentId, aadhaar, tokenId, payableAmount);
        emit SubsidyApplied(aadhaar, subsidyAmount);
        
        return paymentId;
    }
    
    function completePayment(
        uint256 paymentId,
        string memory upiTransactionId
    ) external onlyShopkeeper whenNotPaused paymentSystemEnabled {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.payments[paymentId].paymentId != 0, "Payment not found");
        require(s.payments[paymentId].shopkeeper == msg.sender, "Not your payment");
        require(!s.payments[paymentId].isVerified, "Payment already completed");
        require(bytes(upiTransactionId).length > 0, "UPI transaction ID required");
        
        // Verify UPI transaction ID is unique
        require(s.upiTransactionToPayment[upiTransactionId] == 0, "UPI transaction already used");
        
        // Update payment record
        s.payments[paymentId].upiTransactionId = upiTransactionId;
        s.payments[paymentId].isVerified = true;
        s.upiTransactionToPayment[upiTransactionId] = paymentId;
        
        // Generate invoice
        _generateInvoice(paymentId);
        
        _logActivity("PAYMENT_COMPLETED", s.payments[paymentId].aadhaar, s.payments[paymentId].tokenId, string(abi.encodePacked("Payment completed: ", upiTransactionId)));
        emit PaymentCompleted(paymentId, upiTransactionId);
        
        // Auto-claim the token after successful payment
        _autoClaimToken(s.payments[paymentId].aadhaar, s.payments[paymentId].tokenId);
    }
    
    function failPayment(uint256 paymentId, string memory reason) external onlyShopkeeper whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.payments[paymentId].paymentId != 0, "Payment not found");
        require(s.payments[paymentId].shopkeeper == msg.sender, "Not your payment");
        require(!s.payments[paymentId].isVerified, "Payment already completed");
        
        _logActivity("PAYMENT_FAILED", s.payments[paymentId].aadhaar, s.payments[paymentId].tokenId, reason);
        emit PaymentFailed(paymentId, reason);
    }
    
    // ============ INVOICE GENERATION ============
    
    function _generateInvoice(uint256 paymentId) internal returns (uint256 invoiceId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        LibAppStorage.PaymentRecord memory payment = s.payments[paymentId];
        
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        IDCVToken.RationTokenData memory tokenData = IDCVToken(s.dcvTokenAddress).getTokenData(payment.tokenId);
        
        (uint256 totalAmount, uint256 subsidyAmount, uint256 payableAmount) = this.calculatePaymentAmount(payment.aadhaar, payment.tokenId);
        
        invoiceId = ++s.nextInvoiceId;
        
        s.invoices[invoiceId] = LibAppStorage.Invoice({
            invoiceId: invoiceId,
            paymentId: paymentId,
            aadhaar: payment.aadhaar,
            consumerName: s.consumers[payment.aadhaar].name,
            shopkeeper: payment.shopkeeper,
            shopkeeperName: s.shopkeepers[payment.shopkeeper].name,
            tokenId: payment.tokenId,
            category: s.consumers[payment.aadhaar].category,
            rationAmount: tokenData.rationAmount,
            totalAmount: totalAmount,
            subsidyAmount: subsidyAmount,
            payableAmount: payableAmount,
            upiTransactionId: payment.upiTransactionId,
            timestamp: block.timestamp,
            status: "PAID"
        });
        
        // Generate invoice hash (simplified - in real implementation, you'd use IPFS)
        string memory invoiceHash = _generateInvoiceHash(invoiceId);
        s.payments[paymentId].invoiceHash = invoiceHash;
        
        emit InvoiceGenerated(invoiceId, paymentId, invoiceHash);
        return invoiceId;
    }
    
    function _generateInvoiceHash(uint256 invoiceId) internal view returns (string memory) {
        // Simplified hash generation - in production, upload to IPFS and return hash
        return string(abi.encodePacked("INVOICE_", _toString(invoiceId), "_", _toString(block.timestamp)));
    }
    
    function _autoClaimToken(uint256 aadhaar, uint256 tokenId) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        dcvToken.markAsClaimed(tokenId);
        s.consumers[aadhaar].totalTokensClaimed++;
        s.totalTokensClaimed++;
        
        _logActivity("AUTO_CLAIMED_AFTER_PAYMENT", aadhaar, tokenId, "Token auto-claimed after payment");
    }
    
    // ============ QUERY FUNCTIONS ============
    
    function getPaymentRecord(uint256 paymentId) external view returns (LibAppStorage.PaymentRecord memory) {
        require(LibAppStorage.appStorage().payments[paymentId].paymentId != 0, "Payment not found");
        return LibAppStorage.appStorage().payments[paymentId];
    }
    
    function getInvoice(uint256 invoiceId) external view returns (LibAppStorage.Invoice memory) {
        require(LibAppStorage.appStorage().invoices[invoiceId].invoiceId != 0, "Invoice not found");
        return LibAppStorage.appStorage().invoices[invoiceId];
    }
    
    function getConsumerPayments(uint256 aadhaar) external view validAadhaar(aadhaar) returns (uint256[] memory) {
        return LibAppStorage.appStorage().consumerPayments[aadhaar];
    }
    
    function getShopkeeperPayments(address shopkeeper) external view returns (uint256[] memory) {
        require(LibAppStorage.appStorage().shopkeepers_[shopkeeper], "Invalid shopkeeper");
        return LibAppStorage.appStorage().shopkeeperPayments[shopkeeper];
    }
    
    function getTokenPayments(uint256 tokenId) external view returns (uint256[] memory) {
        return LibAppStorage.appStorage().tokenPayments[tokenId];
    }
    
    function verifyUpiTransaction(string memory upiTransactionId) external view returns (bool exists, uint256 paymentId) {
        paymentId = LibAppStorage.appStorage().upiTransactionToPayment[upiTransactionId];
        exists = paymentId != 0;
    }
    
    // ============ DASHBOARD FUNCTIONS ============
    
    function getShopkeeperPaymentSummary(address shopkeeper) external view returns (
        uint256 totalPayments,
        uint256 totalAmount,
        uint256 pendingPayments,
        uint256 completedPayments,
        uint256 failedPayments
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        uint256[] memory payments = s.shopkeeperPayments[shopkeeper];
        
        totalPayments = payments.length;
        totalAmount = 0;
        pendingPayments = 0;
        completedPayments = 0;
        failedPayments = 0;
        
        for (uint256 i = 0; i < payments.length; i++) {
            LibAppStorage.PaymentRecord memory payment = s.payments[payments[i]];
            totalAmount += payment.amount;
            
            if (payment.isVerified) {
                completedPayments++;
            } else {
                pendingPayments++;
            }
        }
    }
    
    function getConsumerPaymentHistory(uint256 aadhaar) external view validAadhaar(aadhaar) returns (
        LibAppStorage.PaymentRecord[] memory payments,
        LibAppStorage.Invoice[] memory invoices
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256[] memory paymentIds = s.consumerPayments[aadhaar];
        
        payments = new LibAppStorage.PaymentRecord[](paymentIds.length);
        invoices = new LibAppStorage.Invoice[](paymentIds.length);
        
        for (uint256 i = 0; i < paymentIds.length; i++) {
            payments[i] = s.payments[paymentIds[i]];
            
            // Find corresponding invoice
            for (uint256 j = 1; j <= s.nextInvoiceId; j++) {
                if (s.invoices[j].paymentId == paymentIds[i]) {
                    invoices[i] = s.invoices[j];
                    break;
                }
            }
        }
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    function _logActivity(string memory action, uint256 aadhaar, uint256 tokenId, string memory details) internal {
        LibAppStorage.appStorage().activityLogs.push(LibAppStorage.ActivityLog({
            timestamp: block.timestamp,
            actor: msg.sender,
            action: action,
            aadhaar: aadhaar,
            tokenId: tokenId,
            details: details
        }));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
