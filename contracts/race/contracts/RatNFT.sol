// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RatNFT
 * @notice ERC721 NFT representing racing rats
 * @dev Each rat can be used to enter races
 */
contract RatNFT is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    // Rat metadata
    struct RatMetadata {
        string name;
        uint8 color; // 0-5 for different rat models
        uint256 mintedAt;
    }

    mapping(uint256 => RatMetadata) public ratMetadata;

    event RatMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string name,
        uint8 color
    );

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI_;
    }

    /**
     * @notice Mint a new rat NFT
     * @param to Address to mint the rat to
     * @param name Name of the rat
     * @param color Color/model type (0-5)
     */
    function mint(
        address to,
        string memory name,
        uint8 color
    ) external returns (uint256) {
        require(color <= 5, "Invalid color");
        require(bytes(name).length > 0, "Name required");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        ratMetadata[tokenId] = RatMetadata({
            name: name,
            color: color,
            mintedAt: block.timestamp
        });

        emit RatMinted(to, tokenId, name, color);

        return tokenId;
    }

    /**
     * @notice Get rat metadata
     * @param tokenId Token ID of the rat
     */
    function getRatMetadata(
        uint256 tokenId
    ) external view returns (RatMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Rat does not exist");
        return ratMetadata[tokenId];
    }

    /**
     * @notice Get all rats owned by an address
     * @param owner Address to query
     */
    function getRatsOfOwner(
        address owner
    ) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @notice Update base URI
     * @param baseTokenURI_ New base URI
     */
    function setBaseURI(string memory baseTokenURI_) external onlyOwner {
        _baseTokenURI = baseTokenURI_;
    }

    /**
     * @notice Get base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}
