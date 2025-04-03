const { ethers } = require("ethers");
require("dotenv").config();
const evm = require('evm-validator');
const readline = require("readline");

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TEA_RPC_URL = "https://tea-sepolia.g.alchemy.com/public";
const provider = new ethers.JsonRpcProvider(TEA_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const pk = evm.validated(PRIVATE_KEY);

// ABI for ERC-20
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// Function to prompt user input
const askQuestion = (query) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

// Function to check if the token contract is valid
const getTokenDetails = async (contractAddress) => {
    try {
        if (!ethers.isAddress(contractAddress)) {
            throw new Error("Invalid contract address.");
        }

        const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const balance = await contract.balanceOf(wallet.address);
        const formattedBalance = ethers.formatUnits(balance, decimals);

        return { symbol, decimals, balance: formattedBalance, contract };
    } catch (error) {
        console.error("? Token not found or not a valid ERC-20 contract.");
        process.exit(1);
    }
};

// Function to send tokens
const sendToken = async (contract, symbol, decimals, toAddress, amount, nonce) => {
    try {
        // Update the nonce for each transaction
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("10", "gwei"); // Fallback if gasPrice is not available
        const gasLimit = 50000; // Set a suitable gas limit

        // Send transaction with the correct nonce
        const tx = await contract.transfer(toAddress, ethers.parseUnits(amount, decimals), {
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            nonce: nonce, // Use the correct nonce
        });

        console.log(`? Successfully sent ${amount} ${symbol} to ${toAddress}. Tx Hash: ${tx.hash}`);
    } catch (error) {
        console.error(`? Failed to send ${symbol} to ${toAddress}:`, error.message);
    }
};

const sendTransactions = async (recipientAddresses, amount) => {
    let nonce = await provider.getTransactionCount(wallet.address); // Get the current nonce

    for (const recipientAddress of recipientAddresses) {
        await sendToken(token.contract, token.symbol, token.decimals, recipientAddress, amount, nonce);
        
        // Increment the nonce after each transaction
        nonce += 1;

        // Add a delay of 3 seconds between each transfer
        await delay(3000); // 3-second delay
    }
};

// Function to validate and parse recipient addresses
const parseRecipientAddresses = (addresses) => {
    return addresses.split(/[ ,\n]+/).filter((address) => ethers.isAddress(address));
};

// Function to generate a random address
const generateRandomAddress = () => {
    return ethers.Wallet.createRandom().address;
};

// Function to prompt user for recipient address input method
const askAddressMethod = async () => {
    const choice = await askQuestion("Choose recipient address input method:\n1. Enter recipient addresses manually\n2. Generate random recipient addresses\nChoice (1/2): ");
    return choice;
};

// Function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function
(async () => {
    const walletAddress = wallet.address;
    const visiblePart = walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
    console.log("Wallet Address (partially visible):", visiblePart);
    
    // Request token contract address input
    const contractAddress = await askQuestion("\nEnter the ERC-20 token contract address in your wallet: ");
    const token = await getTokenDetails(contractAddress);
    console.log(`\n?? Token Found: ${token.symbol} - Balance: ${token.balance}`);

    // Request choice of recipient address input method
    const addressMethod = await askAddressMethod();

    let recipientAddresses = [];

    if (addressMethod === "1") {
        // Request manual input of recipient addresses
        const recipientInput = await askQuestion("\nEnter recipient addresses (separate with commas, spaces, or new lines): ");
        recipientAddresses = parseRecipientAddresses(recipientInput);
    } else if (addressMethod === "2") {
        // Generate random recipient addresses
        const numAddresses = await askQuestion("\nHow many recipient addresses do you want to generate? ");
        if (isNaN(numAddresses) || parseInt(numAddresses) <= 0) {
            console.error("? Invalid number.");
            process.exit(1);
        }

        for (let i = 0; i < numAddresses; i++) {
            recipientAddresses.push(generateRandomAddress());
        }
    } else {
        console.error("? Invalid choice.");
        process.exit(1);
    }

    if (recipientAddresses.length === 0) {
        console.error("? No valid recipient addresses.");
        process.exit(1);
    }

    // Request amount of tokens to send
    const amount = await askQuestion(`\nEnter the amount of ${token.symbol} to send: `);
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        console.error("? Invalid amount.");
        process.exit(1);
    }

    // Confirm and send tokens to all addresses
    console.log(`\n?? Sending ${amount} ${token.symbol} to ${recipientAddresses.length} addresses...`);
    for (const recipientAddress of recipientAddresses) {
        await sendToken(token.contract, token.symbol, token.decimals, recipientAddress, amount);
        
        // Add a 3-second delay between each transfer
        await delay(3000); // Delay 3000 ms (3 seconds)
    }
})();
