// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

// solhint-disable func-name-mixedcase
/**
 * Interface for accessing [State Connector](https://docs.flare.network/tech/state-connector) Merkle roots.
 * The Merkle roots are necessary to validate data retrieved from attestation providers.
 */
interface IMerkleRootStorage {
    /**
     * Retrieves the Merkle root for a specified round. Requests are valid only within the range of TOTAL_STORED_PROOFS.
     *
     * @param _roundId The ID of the round for which the Merkle root is being requested.
     *                 It must be within the last 6720 rounds, which equals one week's worth of proofs, given the current 90-second BUFFER_WINDOW.
     * @return The Merkle root for the specified round. If the round ID is out of bounds, it reverts.
     */
    function merkleRoot(uint256 _roundId) external view returns (bytes32);
}
