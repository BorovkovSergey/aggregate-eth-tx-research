const ethers = require("ethers");
const Web3 = require('web3');
const web3 = new Web3('https://rpc.ankr.com/eth_goerli');

const erc20Compiled = require('../node_modules/@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
const erc20abi = erc20Compiled.abi;
const erc20bytecode = erc20Compiled.bytecode;

const mainAddr = "0xe9CB692d2C362950B52E2a974B781cd65EBf44EC";
const mainPK = "...";

let erc20Address; // "0xF1804Ee73AF1F226f6F7039b08FE4080B10AA608"
let erc20Contract;

describe('deploy erc 20', () => {
    it("deploy my token", async () => {
        const signer_initial_balance = await web3.eth.getBalance(mainAddr);
        console.log(signer_initial_balance);
        erc20Contract = new web3.eth.Contract(erc20abi, erc20Address);

        // DEPLOY MYTOKEN
        {
            const contract = new web3.eth.Contract(erc20abi);

            const deploy = contract.deploy({
                data: erc20bytecode,
                arguments: ["GraysToken", "GRS"]
            });
            const deployTransaction = deploy.encodeABI();
            const gasEstimate = await web3.eth.estimateGas({
                data: deployTransaction
            });


            const signedTx = await web3.eth.accounts.signTransaction({
                nonce: web3.utils.toHex(4),
                gasPrice: web3.utils.toWei('20', 'gwei'),
                gasLimit: web3.utils.toHex(5236985),
                value: web3.utils.toHex(web3.utils.toWei('0.0', 'ether')),
                data: deployTransaction
            }, mainPK);

            const deployReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log("deployReceipt:", deployReceipt);

            erc20Address = deployReceipt.options.address;

            erc20Contract = new web3.eth.Contract(erc20abi, erc20Address);

            console.log("erc20Address:", erc20Address);


            const signer_deployed_balance = await web3.eth.getBalance(mainAddr);
            console.log(signer_deployed_balance);
        }
    }).timeout(10000000);
});
