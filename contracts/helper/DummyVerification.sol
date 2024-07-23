// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../attestationType/MatchResult.sol";

contract DummyVerification {

    function verifyMatchResult(
        MatchResult.Proof calldata _proof
    ) external view returns (bool _proved) {
        return true;
    }
}
