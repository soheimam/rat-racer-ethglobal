// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title RaceToken
 * @notice ERC20 token for race entry fees
 */
contract RaceToken is ERC20 {
    constructor() ERC20("Race Token", "RACE") {
        // Mint full supply to designated address
        _mint(0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830, 1_000_000_000 * 10 ** decimals());
    }
}

