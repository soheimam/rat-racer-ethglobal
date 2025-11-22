// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title RaceToken
 * @notice ERC20 token for race entry fees (TEST VERSION)
 * @dev For testing - allows anyone to mint tokens
 */
contract RaceToken is ERC20 {
    constructor() ERC20("Race Token", "RACE") {}

    /**
     * @notice Mint tokens for testing
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
