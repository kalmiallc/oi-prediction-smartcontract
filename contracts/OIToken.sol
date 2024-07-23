// SPDX-License-Identifier: MIT

pragma solidity >=0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OIToken is ERC20 {

    mapping(address => mapping(uint256 => bool)) public hasMinted;

    constructor(
        string memory name, 
        string memory symbol
    ) ERC20(name, symbol) {
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function mint() external {
        uint256 day = roundTimestampToDay(block.timestamp);
        require(!hasMinted[msg.sender][day], "Cooldown until tommorow");

        hasMinted[msg.sender][day] = true;

        _mint(msg.sender, 1_000 * 1e18);
    }

    function roundTimestampToDay(uint256 timestamp) private pure returns (uint256) {
        return timestamp - (timestamp % 86400);
    }

    function canMint(address user) public view returns (bool) {
        uint256 day = roundTimestampToDay(block.timestamp);
        return !hasMinted[user][day];
    }
}
