const ethers = require("ethers");
const Web3 = require('web3');
const web3 = new Web3('https://rpc.ankr.com/eth_goerli');
// const web3 = new Web3('https://rpc.ankr.com/eth');
const {
    FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");

const provider = ethers.providers.getDefaultProvider('goerli')

const erc20Compiled = require('../node_modules/@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
const erc20abi = erc20Compiled.abi;
const erc20bytecode = erc20Compiled.bytecode;

const mainAddr = "0xe9CB692d2C362950B52E2a974B781cd65EBf44EC";
const mainPK = "...";

const authSigner = new ethers.Wallet("0xfd579c7e070a50de47e55c6bfba7733c0774457342cbb5b011b3abf5636d94ae");

const userAddr = "0xd3f50Eb860EBd63a39167a3c21dA1407B5ad1Fe9";
const userPK = "...";


let erc20Address = "0xF1804Ee73AF1F226f6F7039b08FE4080B10AA608";
let erc20Contract = new web3.eth.Contract(erc20abi, erc20Address);

describe('Aggregation', () => {
    it("should do send funds over redirect contract", async () => {
        const flashbotsProvider = await FlashbotsBundleProvider.create(
            provider,
            authSigner,
            "https://relay-goerli.flashbots.net",
            "goerli"
        );


        let transfer_to_signer = erc20Contract.methods.transfer(mainAddr, 1000);
        let transfer_to_signer_abi = erc20Contract.methods.transfer(mainAddr, 1000).encodeABI();

        let estimated_gas = await transfer_to_signer.estimateGas({ from: userAddr, data: transfer_to_signer_abi });
        console.log("estimated_gas:", estimated_gas);


        // get current nonce perceived by blockchain
        const user_nonce = await web3.eth.getTransactionCount(userAddr);
        console.log("user_nonce", user_nonce);


        const auth_nonce = await web3.eth.getTransactionCount(mainAddr);
        console.log("auth_nonce", auth_nonce);

        const gas_price = web3.utils.toWei('20', 'gwei');
        console.log("gas_price", gas_price);

        const signedAuthTx = await web3.eth.accounts.signTransaction({
            nonce: auth_nonce,
            gasPrice: gas_price,
            gasLimit: 31000,
            to: userAddr,
            value: estimated_gas * gas_price,
        }, mainPK);

        const signedUserTx = await web3.eth.accounts.signTransaction({
            nonce: user_nonce,
            gasPrice: gas_price,
            gasLimit: estimated_gas,
            value: web3.utils.toHex(web3.utils.toWei('0.0', 'ether')),
            to: erc20Address,
            data: transfer_to_signer_abi
        }, userPK);


        const signedTransactions = await flashbotsProvider.signBundle([
            {
                signedTransaction: signedAuthTx.rawTransaction,
            },
            {
                signedTransaction: signedUserTx.rawTransaction,
            },
        ]);

        console.log("signedTransactions ready");

        const blockNumber = await web3.eth.getBlockNumber();


        console.log(new Date());
        const simulation = await flashbotsProvider.simulate(
            signedTransactions,
            blockNumber + 1
        );
        console.log(new Date());

        // Using TypeScript discrimination
        if ("error" in simulation) {
            console.log(`Simulation Error: ${simulation.error.message}`);
        } else {
            console.log(
                `Simulation Success: ${blockNumber} ${JSON.stringify(
                    simulation,
                    null,
                    2
                )}`
            );
        }
        console.log(signedTransactions);

        for (var i = 1; i <= 10; i++) {
            const bundleSubmission = await flashbotsProvider.sendRawBundle(
                signedTransactions,
                blockNumber + i
            );
            console.log("submitted for block # ", blockNumber + i);
        }

    }).timeout(10000000);
});

