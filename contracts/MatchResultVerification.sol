// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./attestationType/MatchResult.sol";
import "./IMerkleRootStorage.sol";
import "./IMatchResultVerification.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * Contract for verifying MatchResult attestations within the [State Connector](https://docs.flare.network/tech/state-connector/).
 * This contract can be utilized at the end of the attestation request process to verify that the data
 * returned by an attestation provider matches the on-chain Merkle proof.
 */
contract MatchResultVerification is IMatchResultVerification {
    using MerkleProof for bytes32[];

    IMerkleRootStorage public immutable merkleRootStorage;

    constructor(IMerkleRootStorage _merkleRootStorage) {
        merkleRootStorage = _merkleRootStorage;
    }

    /**
     * @inheritdoc IMatchResultVerification
     */
    function verifyMatchResult(
        MatchResult.Proof calldata _proof
    ) external view returns (bool _proved) {
        return
            _proof.data.attestationType == bytes32("MatchResult") &&
            _proof.merkleProof.verify(
                merkleRootStorage.merkleRoot(_proof.data.votingRound),
                keccak256(abi.encode(_proof.data))
            );
    }
}
