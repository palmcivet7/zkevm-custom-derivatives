import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "../styles/DeployedContracts.module.css";
import {
  CUSTOM_DERIVATIVE_ABI,
  ZKEVM_POLYGONSCAN_RPC_URL,
  ERC20_ABI,
  DEPLOYED_CUSTOM_DERIVATIVE_ADDRESS,
} from "../utils/constants";

const DeployedContracts = () => {
  const [deployedContract, setDeployedContract] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => setConnectedWallet(accounts[0] || ""))
        .catch((error) => console.error(error));

      window.ethereum.on("accountsChanged", (accounts) => {
        setConnectedWallet(accounts[0] || "");
      });
    }

    fetchContractDetails(DEPLOYED_CUSTOM_DERIVATIVE_ADDRESS);
  }, []);

  const fetchContractDetails = async (contractAddress) => {
    const provider = new ethers.providers.JsonRpcProvider(
      ZKEVM_POLYGONSCAN_RPC_URL
    );
    const contract = new ethers.Contract(
      contractAddress,
      CUSTOM_DERIVATIVE_ABI,
      provider
    );

    try {
      const underlyingAsset = "ETH"; // You may update this as per your contract logic
      const strikePrice = await contract.strikePrice();
      const settlementTime = new Date((await contract.settlementTime()) * 1000);
      const collateralAsset = await contract.collateralToken();
      const collateralAmount = await contract.collateralAmount();
      const deployer = await contract.partyA();
      const isPartyALong = await contract.isPartyALong();
      const partyACollateral = await contract.partyACollateral();
      const partyBCollateral = await contract.partyBCollateral();

      const deployerDeposited = partyACollateral.gt(ethers.constants.Zero);
      const counterpartyDeposited = partyBCollateral.gt(ethers.constants.Zero);

      setDeployedContract({
        address: contractAddress,
        chain: "Polygon zkEVM Testnet",
        underlyingAsset,
        strikePrice: ethers.utils.formatUnits(strikePrice, 18),
        settlementTime: settlementTime.toLocaleString(),
        collateralAsset,
        collateralAmount: ethers.utils.formatUnits(collateralAmount, 18),
        deployer,
        position: isPartyALong ? "Long" : "Short",
        deployerDeposited,
        counterpartyDeposited,
      });
    } catch (error) {
      console.error(
        `Error fetching details for contract ${contractAddress}:`,
        error
      );
    }
  };

  const formatAsset = (assetAddress) => {
    switch (assetAddress) {
      case "0x26690F9f17FdC26D419371315bc17950a0FC90eD":
        return "ETH";
      case "0x8A601b3048b67f7b0cad8E2a14e0f4719e810B51":
        return "USDC";
      default:
        return assetAddress;
    }
  };

  const handleDeposit = async (contract, isDeployer) => {
    if (!window.ethereum) {
      console.log("Ethereum wallet not connected");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contractInstance = new ethers.Contract(
      contract.address,
      CUSTOM_DERIVATIVE_ABI,
      signer
    );

    const collateralTokenContract = new ethers.Contract(
      contract.collateralAsset,
      ERC20_ABI,
      signer
    );

    try {
      const collateralAmount = await contractInstance.collateralAmount();
      const amountInWei = collateralAmount.toString();

      const allowance = await collateralTokenContract.allowance(
        connectedWallet,
        contract.address
      );
      if (allowance.lt(collateralAmount)) {
        alert(
          "This transaction is for approving the token transfer only, another transaction will have to be made for the deposit afterwards"
        );
        const approveTx = await collateralTokenContract.approve(
          contract.address,
          amountInWei
        );
        await approveTx.wait();
      }

      let tx;

      if (
        isDeployer &&
        connectedWallet.toLowerCase() === contract.deployer.toLowerCase()
      ) {
        tx = await contractInstance.depositCollateralPartyA(amountInWei);
      } else if (
        !isDeployer &&
        connectedWallet.toLowerCase() !== contract.deployer.toLowerCase()
      ) {
        tx = await contractInstance.agreeToContractAndDeposit(amountInWei);
      } else {
        console.log("Not authorized or incorrect function call");
        return;
      }

      const receipt = await tx.wait();
      const updatedContract = {
        ...contract,
        deployerDeposited: isDeployer || contract.deployerDeposited,
        counterpartyDeposited: !isDeployer || contract.counterpartyDeposited,
        txHash: receipt.transactionHash,
      };

      setDeployedContracts((currentContracts) =>
        currentContracts.map((c) =>
          c.address === contract.address ? updatedContract : c
        )
      );
    } catch (error) {
      console.error("Error during transaction:", error);
    }
  };

  return (
    <div>
      <h2>Deployed Contract on Polygon zkEVM Testnet</h2>
      {deployedContract ? (
        <div className={styles.deployedContractItem}>
          <p>
            <strong>Contract Address:</strong>{" "}
            <a
              href={`https://testnet-zkevm.polygonscan.com/address/${deployedContract.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {deployedContract.address}
            </a>
          </p>
          <p>
            <strong>Underlying Asset:</strong>{" "}
            {formatAsset(deployedContract.underlyingAsset)}
          </p>
          <p>
            <strong>Strike Price:</strong> {deployedContract.strikePrice}
          </p>
          <p>
            <strong>Settlement Time:</strong> {deployedContract.settlementTime}
          </p>
          <p>
            <strong>Collateral Asset:</strong>{" "}
            {formatAsset(deployedContract.collateralAsset)}
          </p>
          <p>
            <strong>Collateral Amount:</strong>{" "}
            {deployedContract.collateralAmount}
          </p>
          <p>
            <strong>Deployer:</strong> {deployedContract.deployer}
          </p>
          <p>
            <strong>Position:</strong> {deployedContract.position}
          </p>
          <p>
            <strong>Deployer Deposited:</strong>{" "}
            {deployedContract.deployerDeposited ? "Yes" : "No"}
          </p>
          <p>
            <strong>Counterparty Deposited:</strong>{" "}
            {deployedContract.counterpartyDeposited ? "Yes" : "No"}
          </p>

          <div className={styles.buttons}>
            <button
              onClick={() => handleDeposit(deployedContract, true)}
              disabled={
                !connectedWallet ||
                connectedWallet.toLowerCase() !==
                  deployedContract.deployer.toLowerCase() ||
                deployedContract.deployerDeposited
              }
              className={`${styles.depositButton} ${
                !connectedWallet ||
                connectedWallet.toLowerCase() !==
                  deployedContract.deployer.toLowerCase() ||
                deployedContract.deployerDeposited
                  ? styles.buttonDisabled
                  : ""
              }`}
            >
              {deployedContract.deployerDeposited
                ? "Deployer Deposited"
                : "Deposit as Deployer"}
            </button>
            <button
              onClick={() => handleDeposit(deployedContract, false)}
              disabled={
                !connectedWallet ||
                connectedWallet.toLowerCase() ===
                  deployedContract.deployer.toLowerCase() ||
                deployedContract.counterpartyDeposited
              }
              className={`${styles.depositButton} ${
                !connectedWallet ||
                connectedWallet.toLowerCase() ===
                  deployedContract.deployer.toLowerCase() ||
                deployedContract.counterpartyDeposited
                  ? styles.buttonDisabled
                  : ""
              }`}
            >
              {deployedContract.counterpartyDeposited
                ? "Counterparty Deposited"
                : "Deposit as Counterparty"}
            </button>
          </div>
          {deployedContract.txHash && (
            <div>
              <a
                href={`https://testnet-zkevm.polygonscan.com/tx/${deployedContract.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Transaction
              </a>
            </div>
          )}
        </div>
      ) : (
        <p>No deployed contract found.</p>
      )}
    </div>
  );
};

export default DeployedContracts;
