const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const MockUSDC = await hre.ethers.getContractFactory('MockUSDC');
  const mockUsdc = await MockUSDC.deploy();
  await mockUsdc.waitForDeployment();

  const InvoiceRegistry = await hre.ethers.getContractFactory('InvoiceRegistry');
  const registry = await InvoiceRegistry.deploy();
  await registry.waitForDeployment();

  const LiquidityPool = await hre.ethers.getContractFactory('LiquidityPool');
  const pool = await LiquidityPool.deploy(await mockUsdc.getAddress(), await registry.getAddress());
  await pool.waitForDeployment();

  console.log('MockUSDC:', await mockUsdc.getAddress());
  console.log('InvoiceRegistry:', await registry.getAddress());
  console.log('LiquidityPool:', await pool.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
