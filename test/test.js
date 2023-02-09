const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const BigNumber = require('bignumber.js');

const compiledFundRedirectFromCompiled = require('../build/contracts/FundRedirectFrom.json');
const redirectAbi = compiledFundRedirectFromCompiled.abi;
const redirectBytecode = compiledFundRedirectFromCompiled.bytecode;

const erc20Compiled = require('../node_modules/@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
const erc20abi = erc20Compiled.abi;
const erc20bytecode = erc20Compiled.bytecode;

let erc20Address;
let erc20Contract;

let redirectContract;
let redirectAddress;
let toAccountAddress;

const maxUint256 = new BigNumber("2").pow(256).minus(1);

before(async () => {
    accounts = await web3.eth.getAccounts();

    // DEPLOY MYTOKEN
    {
        const contract = new web3.eth.Contract(erc20abi);

        const deploy = contract.deploy({
            data: erc20bytecode,
            arguments: ["MyToken", "MTK"]
        });
        const deployTransaction = deploy.encodeABI();
        const gasEstimate = await web3.eth.estimateGas({
            data: deployTransaction
        });
        const deployReceipt = await deploy.send({
            from: accounts[0],
            gas: gasEstimate,
            gasPrice: web3.utils.toWei('20', 'gwei')
        });

        erc20Address = deployReceipt.options.address;

        erc20Contract = new web3.eth.Contract(erc20abi, erc20Address);
    }

    const password_to = "testpassword2";
    toAccountAddress = await web3.eth.personal.newAccount(password_to);
    await web3.eth.personal.unlockAccount(toAccountAddress, password_to, 600);

    // DEPLOY REDIRECTOR
    {
        const redirect = new web3.eth.Contract(redirectAbi);

        const deployRedirect = redirect.deploy({
            data: redirectBytecode,
            arguments: [toAccountAddress],
        });
        const deployRedirectTransaction = deployRedirect.encodeABI();

        const gasEstimateLib = await web3.eth.estimateGas({ data: deployRedirectTransaction });
        const deployRedirectReceiptLib = await deployRedirect.send({
            from: accounts[0],
            gas: gasEstimateLib,
            gasPrice: web3.utils.toWei('20', 'gwei')
        });

        redirectAddress = deployRedirectReceiptLib.options.address;

        redirectContract = new web3.eth.Contract(redirectAbi, redirectAddress);
    }
})

describe('Aggregation', () => {
    it("should do send funds over redirect contract", async () => {
        const signerPK = "cfb12303a19cde580bb4dd771639b0d26bc68353645571a8cff516ab2ee113a0";
        const signer = web3.eth.accounts.privateKeyToAccount(signerPK).address;

        await web3.eth.sendTransaction({ from: accounts[0], to: signer, value: web3.utils.toWei('10', 'ether') });

        const signer_initial_balance = await web3.eth.getBalance(signer);
        assert.equal(signer_initial_balance.toString(10), "10000000000000000000");


        const fromPK = "cfb12303a19cde580bb4dd771639b0d26bc68353645571a8cff516ab2ee113a1";
        const from = web3.eth.accounts.privateKeyToAccount(fromPK).address;

        await web3.eth.sendTransaction({ from: accounts[0], to: from, value: web3.utils.toWei('10', 'ether') });




        await erc20Contract.methods.mint(from, "100").send({
            from: accounts[0],
            gasLimit: 2000000
        });


        let approveAbi = erc20Contract.methods.approve(redirectAddress, maxUint256).encodeABI();
        const approveTx = await web3.eth.accounts.signTransaction({
            nonce: web3.utils.toHex(0),
            gasPrice: web3.utils.toWei('20', 'gwei'),
            gasLimit: web3.utils.toHex(500000),
            to: erc20Address,
            value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
            data: approveAbi
        }, fromPK);
        await web3.eth.sendSignedTransaction(approveTx.rawTransaction);

        const initial_balance = await erc20Contract.methods.balanceOf(signer).call();
        assert.equal(initial_balance.toString(10), "0");
        const from_initial_balance = await erc20Contract.methods.balanceOf(from).call();
        assert.equal(from_initial_balance.toString(10), "100");

        let send_data = redirectContract.methods.withdraw(erc20Address, from).encodeABI();


        const signedTx = await web3.eth.accounts.signTransaction({
            nonce: web3.utils.toHex(0),
            gasPrice: web3.utils.toWei('20', 'gwei'),
            gasLimit: web3.utils.toHex(500000),
            to: redirectAddress,
            value: web3.utils.toHex(web3.utils.toWei('0.0', 'ether')),
            data: send_data
        }, signerPK);

        await web3.eth.sendSignedTransaction(signedTx.rawTransaction);


        const to_balance = await erc20Contract.methods.balanceOf(toAccountAddress).call();
        assert.equal(to_balance.toString(10), "100");


        // CHECK setupSol
        await web3.eth.sendTransaction({ from: accounts[0], to: toAccountAddress, value: web3.utils.toWei('10', 'ether') });

        await redirectContract.methods.setupSol(toAccountAddress, "7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm").send({
            from: toAccountAddress,
            gasLimit: 2000000
        });
    });
});