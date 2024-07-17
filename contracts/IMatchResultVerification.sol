// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

import "../../../interface/types/MatchResult.sol";

/**
 * Interface for verifying MatchResult attestations within the [State Connector](https://docs.flare.network/tech/state-connector/).
 * This interface can be utilized at the end of the attestation request process to verify that the data
 * returned by an attestation provider matches the on-chain Merkle proof.
 */
interface IMatchResultVerification {

    /**
    * Verifies the MatchResult attestation using a Merkle proof.
    * It checks whether the provided proof corresponds to the on-chain Merkle root for the voting round specified inside the proof.
    * @param _proof The MatchResult attestation proof, which includes the Merkle proof and the attestation data.
    *               This proof is obtained directly from attestation providers.
    *               To learn about the format of this data, see [Attestation types](https://github.com/flare-foundation/songbird-state-connector-protocol/blob/main/specs/attestations/attestation-type-definition.md).
    * @return _proved Whether the attestation is successfully verified.
    */
    function verifyMatchResult(
        MatchResult.Proof calldata _proof
    ) external view returns (bool _proved);
}
   