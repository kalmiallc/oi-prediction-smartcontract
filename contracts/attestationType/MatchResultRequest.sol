// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6 <0.9;

///////////////////////////////////////////////////////////////////
// DO NOT CHANGE Request and Response definitions!!!
///////////////////////////////////////////////////////////////////

/**
* Verification logic description:
* 1. The RequestBody uses four parameters to get the response.
*   - date: match date (unix timestamp without hour - rounded down to day).
*   - sport: match sport (enum Sports).
*   - gender: for which gender is the match (0 = male, 1 = female).
*   - teams: match teams.
*
*The ResponseBody returns one parameter in the response:
*   - timestamp: Unix timestamp of the exact match beginning
*   - result: Possible return values are 1 = team 1 won, 2 = team 2 won, 3 = draw
*
*Verification logic
*
*The verification logic has the following sequence:
*  1. The RequestBody data is used to get the match result from the third party API. The API returns the match result data + timestamp of the match beginning.
*  2. If match is not finished yet or results are not yet available, third party API returns result: 0. This results in verification failed.
*  3. If result & timestamp is return, that means that match result is available and can be successfully verified.
*  4. Note: timestamp field is the sole indicator that the 3rd party result api was actually called, and result was not mocked or manually set.
*
** Example:
*
** Request:
*  - date: 1720569600
*  - sport: 5
*  - gender: 0
*  - teams: "England:Slovenia"
*
** Response:
*  - timestamp: 1720612800
*  - result: 2
* *  
* * 
* */



/**
 * @custom:name MatchResultRequest
 * @custom:id 0x07
 * @custom:supported WEB
 * @author Kalmia
 * @notice Returns the result for specified game UID.
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
     * @param date date of a match (unix timestamp without hour - rounded down to day)
     * @param sport id of a sport from
     *       0 - Basketball,
     *       1 - Basketball3x3,
     *       2 - Badminton,
     *       3 - BeachVolley,
     *       4 - FieldHockey,
     *       5 - Football,
     *       6 - Handball,
     *       7 - TableTennis,
     *       8 - Tennis,
     *       9 - Volleyball,
     *       10 - WaterPolo
     * @param gender 0 - male, 1 - female
     * @param teams teams playing the game, divided with comma (example: England,Slovenia)
     */
    struct RequestBody {
        uint256 date;
        uint32 sport;
        uint8 gender;
        string teams;
    }

    /**
     * @notice Response body for MatchResultRequest attestation type.
     * @param timestamp Unix timestamp of the exact match beginning
     * @param result Possible return values are 0 = no data, 1 = team 1 won, 2 = team 2 won, 3 = draw
     */
    struct ResponseBody {
        uint256 timestamp;
        uint8 result;
    }
}
