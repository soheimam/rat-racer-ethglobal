// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title RaceToken
 * @notice ERC20 token for Rat Racer game - race entry fees and rewards
 * @dev Fixed supply of 1 billion tokens minted to treasury on deployment
 */
contract RaceToken is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens

    constructor() ERC20("Race Token", "RACE") {
        // Mint entire supply to treasury address
        _mint(0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830, TOTAL_SUPPLY);
    }
}
