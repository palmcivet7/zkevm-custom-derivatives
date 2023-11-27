import React, { useState } from "react";
import styles from "../styles/DeploySection.module.css";
import { ethers } from "ethers";
import {
  DERIVATIVE_FACTORY_ADDRESS,
  DERIVATIVE_FACTORY_ABI,
  API3_ETH_PRICE_FEED_ADDRESS,
  MOCK_USDC_TOKEN_ADDRESS,
} from "../utils/constants";

const DeploySection = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [formData, setFormData] = useState({
    underlyingAsset: "",
    strikePrice: "",
    settlementTime: "",
    collateralAsset: "",
    collateralAmount: "",
    position: "", // 'long' or 'short'
  });
  const [settlementTime, setSettlementTime] = useState("");

  const handleSettlementTimeChange = (e) => {
    setSettlementTime(e.target.value);
    setFormData({ ...formData, settlementTime: e.target.value });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePositionChange = (position) => {
    setFormData({ ...formData, position });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading

    // Ensure window.ethereum is available
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Confirm network connection and user's account
        const network = await provider.getNetwork();
        const userAddress = await signer.getAddress();

        console.log("Connected to network:", network);
        console.log("User's address:", userAddress);

        // Convert strike price and collateral amount to Wei
        const strikePriceInWei = ethers.utils
          .parseUnits(formData.strikePrice, 18)
          .toString();
        const collateralAmountInWei = ethers.utils
          .parseUnits(formData.collateralAmount, 18)
          .toString();

        // Convert settlement time to Unix timestamp
        const settlementTimeUnix =
          new Date(formData.settlementTime).getTime() / 1000;

        // Determine if Party A is Long
        const isPartyALong = formData.position === "long";

        // Define the collateral token address
        const collateralTokenAddress =
          formData.collateralAsset === "USDC" ? MOCK_USDC_TOKEN_ADDRESS : ""; // Adjust logic for different assets

        // Interact with the Derivative Factory contract
        const contract = new ethers.Contract(
          DERIVATIVE_FACTORY_ADDRESS,
          DERIVATIVE_FACTORY_ABI,
          signer
        );

        // Call the createCustomDerivative function
        const tx = await contract.createCustomDerivative(
          API3_ETH_PRICE_FEED_ADDRESS, // Assuming ETH is the only option
          strikePriceInWei,
          settlementTimeUnix,
          collateralTokenAddress,
          collateralAmountInWei,
          isPartyALong
        );

        const receipt = await tx.wait();
        setTxHash(receipt.transactionHash); // Update txHash state
        console.log("Contract deployed successfully");
      } catch (error) {
        console.error("Error deploying contract:", error);
      }
    } else {
      console.log("MetaMask is not installed");
    }

    setLoading(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    setSettlementTime("");
    // Reset other form data as needed
    setFormData({
      underlyingAsset: "",
      strikePrice: "",
      settlementTime: "",
      collateralAsset: "",
      collateralAmount: "",
      position: "",
    });
  };

  return (
    <div>
      <p>Create a custom derivative contract on Polygon zkEVM Testnet.</p>

      {!showModal && (
        <button onClick={() => setShowModal(true)}>Create Contract</button>
      )}

      {showModal && !loading && !txHash && (
        <div className={styles.modal}>
          <form onSubmit={handleSubmit}>
            {/* Dropdown for underlying asset */}
            <div className={styles.formElement}>
              <select name="underlyingAsset" onChange={handleInputChange}>
                <option value="">Select Underlying Asset</option>
                <option value="ETH">ETH</option>
                <option value="">BTC</option>
                {/* Add more assets as needed */}
              </select>
            </div>

            {/* Input for strike price */}
            <div className={styles.formElement}>
              <input
                type="number"
                name="strikePrice"
                placeholder="Strike Price in $"
                onChange={handleInputChange}
              />
            </div>

            {/* Input/Dropdown for settlement time */}
            <div className={styles.formElement}>
              <input
                type="datetime-local"
                name="settlementTime"
                value={settlementTime}
                onChange={handleSettlementTimeChange}
              />
            </div>

            {/* Dropdown for collateral asset */}
            <div className={styles.formElement}>
              <select name="collateralAsset" onChange={handleInputChange}>
                <option value="">Select Collateral Asset</option>
                <option value="USDC">USDC</option>
                <option value="USDC">ETH</option>
                {/* Add more collateral types as needed */}
              </select>
            </div>

            {/* Input for collateral amount */}
            <div className={styles.formElement}>
              <input
                type="number"
                name="collateralAmount"
                placeholder="Collateral Amount"
                onChange={handleInputChange}
              />
            </div>

            {/* Radio buttons for long/short position */}
            <div className={styles.formElement}>
              <div className={styles.tradePosition}>
                <label>
                  <input
                    type="radio"
                    name="position"
                    value="long"
                    checked={formData.position === "long"}
                    onChange={() => handlePositionChange("long")}
                  />
                  Long Position
                </label>
                <label>
                  <input
                    type="radio"
                    name="position"
                    value="short"
                    checked={formData.position === "short"}
                    onChange={() => handlePositionChange("short")}
                  />
                  Short Position
                </label>
              </div>
            </div>

            <div className={styles.buttons}>
              <button type="submit">Deploy Contract</button>
              <button type="cancel" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="loadingSpinner">Loading...</div> // Replace with your actual spinner
      )}

      {txHash && (
        <div className={styles.successMessage}>
          <p>Transaction Successful!</p>
          <a
            href={`https://testnet-zkevm.polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Polygonscan
          </a>
        </div>
      )}
    </div>
  );
};

export default DeploySection;
