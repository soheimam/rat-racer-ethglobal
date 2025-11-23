// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
    using SafeERC20 for IERC20;

    uint256 private _nextTokenId;
    string private _baseTokenURI;

    // Approved image variants (managed by owner)
    mapping(uint256 => bool) public approvedImageIndex;

    // Rat configuration: imageIndex => payment token address
    mapping(uint256 => address) public ratPaymentToken;

    // Rat configuration: imageIndex => mint price
    mapping(uint256 => uint256) public ratMintPrice;

    /// @notice Emitted when a rat is minted
    /// @param to Address that received the rat
    /// @param tokenId ID of the minted rat
    /// @param imageIndex Visual variant selected by minter
    event RatMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 imageIndex
    );

    /// @notice Emitted when base URI is updated
    event BaseURIUpdated(string newBaseURI);

    /// @notice Emitted when an image variant is approved
    event ImageIndexApproved(uint256 indexed imageIndex);

    /// @notice Emitted when an image variant is removed
    event ImageIndexRemoved(uint256 indexed imageIndex);

    /// @notice Emitted when rat configuration is updated
    event RatConfigUpdated(
        uint256 indexed imageIndex,
        address paymentToken,
        uint256 price
    );

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _nextTokenId = 1;
        _baseTokenURI = baseTokenURI;

        // Approve initial rat variants (0=brown, 1=pink, 2=white)
        approvedImageIndex[0] = true;
        approvedImageIndex[1] = true;
        approvedImageIndex[2] = true;
    }

    /**
     * @notice Mint a new rat NFT with payment
     * @param to Address to mint the rat to
     * @param imageIndex Visual variant selected by user (must be approved)
     * @return tokenId The ID of the minted rat
     *
     * The minting process:
     * 1. User approves ERC20 tokens for this contract
     * 2. User calls mint() → selects imageIndex from approved options
     * 3. Contract validates imageIndex is approved and transfers payment
     * 4. Contract mints NFT → emits RatMinted event with imageIndex
     * 5. Webhook catches event → calls /api/rat-mint
     * 6. API generates random stats/bloodline for chosen variant
     * 7. API uploads metadata.json to Blob Storage
     * 8. tokenURI(tokenId) returns the Blob Storage URL
     */
    function mint(address to, uint256 imageIndex) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(approvedImageIndex[imageIndex], "Image variant not approved");

        // Get payment configuration for this rat variant
        address paymentToken = ratPaymentToken[imageIndex];
        uint256 price = ratMintPrice[imageIndex];

        // Require payment if configured
        if (paymentToken != address(0) && price > 0) {
            IERC20(paymentToken).safeTransferFrom(
                msg.sender,
                address(this),
                price
            );
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        emit RatMinted(to, tokenId, imageIndex);

        return tokenId;
    }

    /**
     * @notice Owner mint a single rat to a specific address (for testing/airdrops)
     * @param to Address to mint the rat to
     * @param imageIndex Visual variant for the rat (must be approved)
     * @return tokenId The ID of the minted rat
     */
    function ownerMint(
        address to,
        uint256 imageIndex
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(approvedImageIndex[imageIndex], "Image variant not approved");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        emit RatMinted(to, tokenId, imageIndex);

        return tokenId;
    }

    /**
     * @notice Batch mint multiple rats (for testing/airdrops)
     * @param to Address to mint rats to
     * @param amount Number of rats to mint
     * @param imageIndex Visual variant for all rats (must be approved)
     */
    function batchMint(
        address to,
        uint256 amount,
        uint256 imageIndex
    ) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0 && amount <= 20, "Amount must be 1-20");
        require(approvedImageIndex[imageIndex], "Image variant not approved");

        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            emit RatMinted(to, tokenId, imageIndex);
        }
    }

    /**
     * @notice Add a new approved image variant
     * @param imageIndex The image variant to approve
     */
    function addApprovedImageIndex(uint256 imageIndex) external onlyOwner {
        require(
            !approvedImageIndex[imageIndex],
            "Image variant already approved"
        );
        approvedImageIndex[imageIndex] = true;
        emit ImageIndexApproved(imageIndex);
    }

    /**
     * @notice Remove an approved image variant
     * @param imageIndex The image variant to remove
     */
    function removeApprovedImageIndex(uint256 imageIndex) external onlyOwner {
        require(approvedImageIndex[imageIndex], "Image variant not approved");
        approvedImageIndex[imageIndex] = false;
        emit ImageIndexRemoved(imageIndex);
    }

    /**
     * @notice Check if an image variant is approved
     * @param imageIndex The image variant to check
     */
    function isImageIndexApproved(
        uint256 imageIndex
    ) external view returns (bool) {
        return approvedImageIndex[imageIndex];
    }

    /**
     * @notice Set payment configuration for a rat variant
     * @param imageIndex The image variant to configure
     * @param paymentToken The ERC20 token address for payment (address(0) for free)
     * @param price The mint price in payment token (0 for free)
     */
    function setRatConfig(
        uint256 imageIndex,
        address paymentToken,
        uint256 price
    ) external onlyOwner {
        ratPaymentToken[imageIndex] = paymentToken;
        ratMintPrice[imageIndex] = price;
        emit RatConfigUpdated(imageIndex, paymentToken, price);
    }

    /**
     * @notice Get payment configuration for a rat variant
     * @param imageIndex The image variant to check
     * @return paymentToken The ERC20 token address for payment
     * @return price The mint price in payment token
     */
    function getRatConfig(
        uint256 imageIndex
    ) external view returns (address paymentToken, uint256 price) {
        return (ratPaymentToken[imageIndex], ratMintPrice[imageIndex]);
    }

    /**
     * @notice Withdraw collected ERC20 tokens to owner
     * @param token The ERC20 token to withdraw
     */
    function withdrawTokens(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        IERC20(token).safeTransfer(owner(), balance);
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
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
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
    function tokensOfOwner(
        address owner
    ) external view returns (uint256[] memory) {
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
