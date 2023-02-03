const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());


const arc20Compiled = require('../node_modules/@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json');
const erc20abi = arc20Compiled.abi;
const erc20bytecode = arc20Compiled.bytecode;
let erc20Address;
let erc20Contract;

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
})

describe('Aggregation', () => {
    it("should do send funds over redirect contract", async () => {
        const password = "testpassword";
        const fromAccountAddress = await web3.eth.personal.newAccount(password);
        await web3.eth.personal.unlockAccount(fromAccountAddress, password, 600);

        await erc20Contract.methods.mint(accounts[0], "100").send({
            from: accounts[0],
            gasLimit: 2000000
        });

        await erc20Contract.methods.transfer(fromAccountAddress, "10").send({
            value: 0,
            from: accounts[0],
            gasLimit: 2000000
        });

        const initial_balance = await erc20Contract.methods.balanceOf(fromAccountAddress).call();
        assert.equal(initial_balance.toString(10), "10");
    });
});