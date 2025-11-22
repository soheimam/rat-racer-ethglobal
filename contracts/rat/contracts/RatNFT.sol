// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RatNFT
 * @notice ERC721 NFT for racing rats - minimal on-chain storage
 * 
 * All rat stats, metadata, and attributes are generated off-chain
 * and stored in Vercel Blob Storage. This contract only tracks ownership.
 * 
 * Metadata is generated randomly at mint time and uploaded to:
 * https://[blob-storage].public.blob.vercel-storage.com/rats/metadata/{tokenId}.json
 */
contract RatNFT is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    /// @notice Emitted when a rat is minted
    event RatMinted(address indexed to, uint256 indexed tokenId);

    /// @notice Emitted when base URI is updated
    event BaseURIUpdated(string newBaseURI);

    constructor() ERC721("Street Racer Rat", "RAT") Ownable(msg.sender) {
        _nextTokenId = 1; // Start at token ID 1
    }

    /**
     * @notice Mint a new rat NFT
     * @param to Address to mint the rat to
     * @return tokenId The ID of the minted rat
     * 
     * The minting process:
     * 1. User calls mint() → pays gas
     * 2. Contract mints NFT → emits RatMinted event
     * 3. Webhook catches event → calls /api/rat-mint
     * 4. API generates random stats/bloodline
     * 5. API uploads metadata.json to Blob Storage
     * 6. tokenURI(tokenId) returns the Blob Storage URL
     */
    function mint(address to) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        emit RatMinted(to, tokenId);
        
        return tokenId;
    }

    /**
     * @notice Batch mint multiple rats (for testing/airdrops)
     * @param to Address to mint rats to
     * @param amount Number of rats to mint
     */
    function batchMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0 && amount <= 20, "Amount must be 1-20");
        
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            emit RatMinted(to, tokenId);
        }
    }

    /**
     * @notice Set the base URI for token metadata
     * @param baseURI The base URI (e.g., https://[...].blob.vercel-storage.com/rats/metadata/)
     * 
     * The full tokenURI will be: baseURI + tokenId + ".json"
     * Example: https://[...].blob.vercel-storage.com/rats/metadata/42.json
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @notice Get the base URI
     */
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Get the token URI for a specific token
     * @param tokenId The token ID
     * @return The full metadata URL
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory base = _baseTokenURI;
        
        // If baseURI is not set, return empty (will be set after deployment)
        if (bytes(base).length == 0) {
            return "";
        }
        
        // Return: baseURI + tokenId + ".json"
        return string(abi.encodePacked(base, _toString(tokenId), ".json"));
    }

    /**
     * @notice Get all token IDs owned by an address
     * @param owner The owner address
     * @return An array of token IDs
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }

    /**
     * @notice Get the next token ID that will be minted
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Get total number of minted rats
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Internal function to convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    /**
     * @dev Override _baseURI to return the stored base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
