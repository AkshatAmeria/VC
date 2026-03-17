// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./InvoiceRegistry.sol";

contract LiquidityPool {
    IERC20 public immutable usdc;
    InvoiceRegistry public immutable registry;

    uint256 public totalLiquidity;
    mapping(address => uint256) public lpBalance;

    event Deposited(address indexed lp, uint256 amount);
    event Financed(uint256 indexed invoiceId, address indexed supplier, uint256 payout);

    constructor(address usdcAddress, address registryAddress) {
        usdc = IERC20(usdcAddress);
        registry = InvoiceRegistry(registryAddress);
    }

    function deposit(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        lpBalance[msg.sender] += amount;
        totalLiquidity += amount;
        emit Deposited(msg.sender, amount);
    }

    function financeInvoice(uint256 invoiceId) external {
        (address supplier,,uint256 amount,,uint16 discountBps,uint8 riskScore,InvoiceRegistry.Status status) = registry.invoices(invoiceId);
        require(status == InvoiceRegistry.Status.Approved, "not approved");
        require(riskScore >= 5, "invalid risk");

        uint256 payout = amount - ((amount * discountBps) / 10_000);
        require(totalLiquidity >= payout, "insufficient pool");
        totalLiquidity -= payout;

        usdc.transfer(supplier, payout);
        registry.markFinanced(invoiceId);
        emit Financed(invoiceId, supplier, payout);
    }
}
