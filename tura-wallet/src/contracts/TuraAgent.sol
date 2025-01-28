// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract TuraAgent {
    address public owner;
    uint256 public constant SUBSCRIPTION_FEE = 0.1 ether;

    constructor() payable {
        owner = msg.sender;
        require(msg.value == SUBSCRIPTION_FEE, "Must send 0.1 TURA");
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}
