const ethers = require("ethers");
const Web3 = require('web3');
const web3 = new Web3('https://rpc.ankr.com/eth_goerli');

const erc20Compiled = require('../node_modules/@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
const erc20abi = erc20Compiled.abi;
const erc20bytecode = erc20Compiled.bytecode;

const mainAddr = "0xe9CB692d2C362950B52E2a974B781cd65EBf44EC";
const mainPK = "...";

const userAddr = "0xd3f50Eb860EBd63a39167a3c21dA1407B5ad1Fe9";

let erc20Address = "0xF1804Ee73AF1F226f6F7039b08FE4080B10AA608";
let erc20Contract = new web3.eth.Contract(erc20abi, erc20Address);

describe('mint erc 20', () => {
    it("mint my token", async () => {
        const signer_initial_balance = await web3.eth.getBalance(mainAddr);
        console.log(signer_initial_balance);
        erc20Contract = new web3.eth.Contract(erc20abi, erc20Address);

        const data = erc20Contract.methods.mint(userAddr, 10000000000000).encodeABI();

        // get current nonce perceived by blockchain
        const nonce = await web3.eth.getTransactionCount(mainAddr);
        console.log(nonce);

        const signedTx = await web3.eth.accounts.signTransaction({
            nonce: nonce,
            gasPrice: web3.utils.toWei('20', 'gwei'),
            gasLimit: web3.utils.toHex(84639),
            value: web3.utils.toHex(web3.utils.toWei('0.0', 'ether')),
            to: erc20Address,
            data: data
        }, mainPK);

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("receipt:", receipt);
    }).timeout(10000000);
});
