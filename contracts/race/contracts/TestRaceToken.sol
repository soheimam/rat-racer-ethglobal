// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestRaceToken
 * @notice ERC20 token for testing ONLY - allows minting
 * @dev DO NOT deploy to mainnet - use RaceToken.sol instead
 */
contract TestRaceToken is ERC20 {
    constructor() ERC20("Test Race Token", "TRACE") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 10000 * 10 ** decimals());
    }

    /**
     * @notice Mint tokens for testing
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
