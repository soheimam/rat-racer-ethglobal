// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RaceToken
 * @notice Mock ERC20 token for race entry fees
 * @dev This is a simple token with minting capabilities for testing
 */
contract RaceToken is ERC20, Ownable {
    constructor() ERC20("Race Token", "RACE") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice Mint tokens (only owner)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Faucet function for testing - anyone can get tokens
     * @dev Remove this in production
     */
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}

