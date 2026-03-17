// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InvoiceRegistry {
    enum Status { Uploaded, Approved, Financed, Repaid }

    struct Invoice {
        address supplier;
        address buyer;
        uint256 amount;
        uint256 dueDate;
        uint16 discountBps;
        uint8 riskScore;
        Status status;
    }

    uint256 public nextInvoiceId = 1;
    mapping(uint256 => Invoice) public invoices;

    event InvoiceUploaded(uint256 indexed invoiceId, address indexed supplier, address indexed buyer, uint256 amount);
    event InvoiceApproved(uint256 indexed invoiceId, address indexed buyer);
    event InvoiceFinanced(uint256 indexed invoiceId);
    event InvoiceRepaid(uint256 indexed invoiceId);

    function uploadInvoice(address buyer, uint256 amount, uint256 dueDate, uint16 discountBps, uint8 riskScore) external returns (uint256) {
        uint256 id = nextInvoiceId++;
        invoices[id] = Invoice(msg.sender, buyer, amount, dueDate, discountBps, riskScore, Status.Uploaded);
        emit InvoiceUploaded(id, msg.sender, buyer, amount);
        return id;
    }

    function approveInvoice(uint256 invoiceId) external {
        Invoice storage inv = invoices[invoiceId];
        require(msg.sender == inv.buyer, "only buyer");
        require(inv.status == Status.Uploaded, "invalid status");
        inv.status = Status.Approved;
        emit InvoiceApproved(invoiceId, msg.sender);
    }

    function markFinanced(uint256 invoiceId) external {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Approved, "not approved");
        inv.status = Status.Financed;
        emit InvoiceFinanced(invoiceId);
    }

    function markRepaid(uint256 invoiceId) external {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Financed, "not financed");
        inv.status = Status.Repaid;
        emit InvoiceRepaid(invoiceId);
    }
}
