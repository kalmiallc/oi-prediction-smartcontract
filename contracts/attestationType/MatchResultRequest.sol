// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

///////////////////////////////////////////////////////////////////
// DO NOT CHANGE Request and Response definitions!!!
///////////////////////////////////////////////////////////////////

/**
 * @custom:name MatchResultRequest
 * @custom:id 0x07
 * @custom:supported WEB
 * @author Kalmia
 * @notice Returns the result for specified game UUID.
 * @custom:verification Result is returned from the oi-flare-proxy API.
 * @custom:lut `0xffffffffffffffff` ($2^{64}-1$ in hex)
 */
interface MatchResultRequest {
    /**
     * @notice Toplevel request
     * @param attestationType ID of the attestation type.
     * @param sourceId ID of the data source.
     * @param messageIntegrityCode `MessageIntegrityCode` that is derived from the expected response.
     * @param requestBody Data defining the request. Type (struct) and interpretation is determined by the `attestationType`.
     */
    struct Request {
        bytes32 attestationType;
        bytes32 sourceId;
        bytes32 messageIntegrityCode;
        RequestBody requestBody;
    }

    /**
     * @notice Toplevel response
     * @param attestationType Extracted from the request.
     * @param sourceId Extracted from the request.
     * @param votingRound The ID of the State Connector round in which the request was considered.
     * @param lowestUsedTimestamp The lowest timestamp used to generate the response.
     * @param requestBody Extracted from the request.
     * @param responseBody Data defining the response. The verification rules for the construction of the response body and the type are defined per specific `attestationType`.
     */
    struct Response {
        bytes32 attestationType;
        bytes32 sourceId;
        uint64 votingRound;
        uint64 lowestUsedTimestamp;
        RequestBody requestBody;
        ResponseBody responseBody;
    }

    /**
     * @notice Toplevel proof
     * @param merkleProof Merkle proof corresponding to the attestation response.
     * @param data Attestation response.
     */
    struct Proof {
        bytes32[] merkleProof;
        Response data;
    }

    /**
     * @notice Request body for MatchResultRequest attestation type
     * @param uuid unique indentifier of a match
     */
    struct RequestBody {
        bytes32 uuid;
    }

    /**
     * @notice Response body for MatchResultRequest attestation type.
     * @param result Possible return values are 1 = team 1 won, 2 = team 2 won, 3 = draw
     */
    struct ResponseBody {
        uint8 result;
    }
}
