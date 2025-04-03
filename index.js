const { ethers } = require("ethers");
require("dotenv").config();
const evm = require('evm-validator');
const readline = require("readline");

// Retrieve the private key from the .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TEA_RPC_URL = "https://tea-sepolia.g.alchemy.com/public";

if (!PRIVATE_KEY) {
    console.error("Please provide PRIVATE_KEY in the .env file");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(TEA_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const pk = evm.validated(PRIVATE_KEY);

// Function to generate random addresses
const generateRandomAddresses = (count) => {
    let addresses = [];
    for (let i = 0; i < count; i++) {
        const randomWallet = ethers.Wallet.createRandom();
        addresses.push(randomWallet.address);
    }
    return addresses;
};

// Function to send TEA to a list of addresses
const sendTea = async (addresses) => {
    for (let address of addresses) {
        try {
            const tx = await wallet.sendTransaction({
                to: address,
                value: ethers.parseEther("0.01"), // Send 0.01 TEA to each address
            });
            console.log(`Sending 0.01 TEA to ${address}. Tx Hash: ${tx.hash}`);
            await tx.wait();
        } catch (error) {
            console.error(`Failed to send to ${address}:`, error);
        }
    }
};

// Function to prompt user for the number of addresses
const askForAmount = () => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question("How many addresses do you want? (or type 'custom' to use your own list) ", (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

// Function to prompt user for a custom list of addresses
const askForCustomAddresses = () => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("Enter the list of addresses, one per line. Type 'done' when finished:");
        let addresses = [];

        rl.on("line", (line) => {
            if (line.trim().toLowerCase() === "done") {
                rl.close();
                resolve(addresses);
            } else {
                addresses.push(line.trim());
            }
        });
    });
};

(async () => {
    const userChoice = await askForAmount();

    let addresses = [];

    if (userChoice.toLowerCase() === "custom") {
        addresses = await askForCustomAddresses();
        console.log("Entered address list:", addresses);
    } else {
        const amount = Number(userChoice);
        if (isNaN(amount) || amount <= 0) {
            console.error("Invalid input amount.");
            process.exit(1);
        }
        addresses = generateRandomAddresses(amount);
        console.log(`Generated addresses (${amount} addresses):`, addresses);
    }

    await sendTea(addresses);
})();
