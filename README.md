# Flare Olympics Prediction Showcase - Contract

**IMPORTANT!!**
The supporting library uses OpenZeppelin version `4.9.3`. Ensure you use the documentation and examples for that specific library version.

## Introduction

This repository contains a sports events betting prediction contract, part of the Flare Data Connector Olympics showcase. This showcase enables users to place predictions on team sports events, supporting wagers with straightforward outcomes: win, lose, or draw. The results of the events are retrieved into the smart contract using the Flare Data Connector capabilities.

The complete showcase consists of four repositories:

- [Prediction smart contract](https://github.com/kalmiallc/oi-prediction-smartcontract)
- [Front-end application](https://github.com/kalmiallc/oi-prediction-webapp)
- [Backend application](https://github.com/kalmiallc/oi-prediction-webapp) which calls the verification provider API for verification
- [Verification server](https://github.com/kalmiallc/oi-match-attestation-server)

The complete guide can be found [here](https://github.com/kalmiallc/oi-flare-prediction-instructions)

## Prediction Logic

The prediction logic operates on dynamic multipliers. Users purchase multiplied amounts (prediction amounts multiplied by the win multiplier). When a prediction is placed, the multiplied amount is stored, guaranteeing the claim amount will be paid when the event concludes.

All multiplied predictions for each game are placed in a prediction pool. The sum of amounts for each choice cannot exceed the total predictions in the pool.

The multiplier is calculated each time a user places a prediction. The number of predictions against the complete pool defines the multiplier factor. The more predictions placed on one choice, the lower the multiplier factor for that choice, and the higher the multiplier factors for other choices.

An initial pool and factors need to be set by the administrator, along with the initial pool of tokens. Each prediction can only be 1/10 of the pool size.

## Flare Data Connector - Results

The results of each match are provided using the [Flare Data Connector](https://flare.network/dataconnector/). The documentation for the connector can be found [here](https://docs.flare.network/tech/state-connector/).

The project provides its own attestation type, the `Match result` attestation type. This attestation type defines how data can be verified by the attestation providers. To identify the match, data is mathed against date,sport,gender and teams.

This attestation is specific to one event (Olympic games) but can be easily extended to other team sports.

A verifier server is implemented for the defined `Match result` attestation type. For this attestation type, the verifier server calls a Web2 API, which returns the match results. If the data aligns with the expected results, it is considered valid. The verifier server is used by the attestation provider. If the verification passes, the data is passed to a voting round and then included in the Merkle tree, which is use to pass the data to the contract.

More developer oriented documentation can be found [here](https://github.com/flare-foundation/songbird-state-connector-protocol/blob/main/README.md)

Flare Olympics Prediction is compatible with both the Coston and Songbird networks, showcasing its flexibility and interoperability.

By utilizing the Flare Data Connector, Flare Olympics Prediction demonstrates how decentralized applications can effectively use external data to provide a seamless and trustworthy prediction experience on the blockchain.

#### Verifier Server

A verifier server is implemented for the defined `Match result` attestation type. The logic for the verifier server is written in TypeScript and is not included in this repository. The verifier server provides the logic for obtaining data from the WEB2 world.

For this attestation type, the verifier server calls a WEB2 API, which returns the match results. If the data aligns with the expected results, it is considered valid. The verifier server is used by the attestation provider. If the verification passes, the data is passed to a voting round and then included in the Merkle tree. Using the Merkle tree proof, the data can be passed to the betting prediction contract.

#### Passing the Data to the Contract

The results data passed to the contract is fetched by calling the `finalizeMatch` method. This method must be called using the Merkle proof. The method uses `MatchResultVerification` contract to verify the results. To get the Merkle tree proof, a WEB2 API call must be made to the attestation provider. The logic for this call is in the `Backend application` repository.

### Getting Started

If you are new to Hardhat, please check the [Hardhat Getting Started Guide](https://hardhat.org/hardhat-runner/docs/getting-started#overview).

1. Clone and install dependencies:

   and then run:

   ```console
   yarn
   ```

   or

   ```console
   npm install
   ```

2. Set up `.env` file

   ```console
   mv .env.example .env
   ```

3. Change the `PRIVATE_KEY` in the `.env` file to yours

4. Compile the project

    ```console
    yarn hardhat compile
    ```

    or

    ```console
    npx hardhat compile
    ```

    This will compile all `.sol` files in your `/contracts` folder. It will also generate artifacts that will be needed for testing. Contracts `Imports.sol` import MockContracts and Flare related mocks, thus enabling mocking of the contracts from typescript.

5. Run Tests

    ```console
    yarn hardhat test
    ```

    or

    ```console
    npx hardhat test
    ```

6. Deploy

    Check the `hardhat.config.ts` file, where you define which networks you want to interact with. Flare mainnet & test network details are already added in that file.

    Make sure that you have added API Keys in the `.env` file

   ```console
   npx hardhat run scripts/tryDeployment.ts
   ```

## Usage

### Import the Data

All the data for the sports events is stored in the contract. To import the data, the `createSportEvent` method on the contract needs to be called for each event.

Each event requires the following data:

- `string memory title`: The title of the sports event - a way to define the teams in the event (could also be teams separated with commas)
- `uint256 startTime`: Epoch representation of the time of the sports event
- `uint8 gender`: Enum-based gender. We can also support mixed genders, singles, doubles.
- `Sports sport`: Enum-based sports (`Sports`).
- `string[] memory choices`: Named choices for each event: 'Slovenia', 'England', 'Draw'
- `uint32[] memory initialVotes`: Initial votes that define the initial multiplier factors.
- `uint256 initialPool`: Initial pool of tokens. The initial pool must be set to have more realistic predictions.
- `bytes32 _uid`: UID of the sports event.

The title, startTime, gender, and sport provide a way to distinguish the sports events. This input is used to generate the UID of the event. The UID is calculated and verified.

The initial pool token amount must be sent to the contract.

A helper script to import the data is available in: `scripts/createSportEvents.ts`.

### Placing Bets Predictions and Claiming

To place a prediction, the `placeBet` method needs to be called with the following input data:

- `bytes32 eventUID`: UID of the event being bet on
- `uint16 choice`: Choice starting with index 0

As the method is payable, the bet prediction amount needs to be sent. When the bet prediction is placed, an event is triggered, returning the betId of the bet prediction.

Bets can only be placed until the start of the event.

Bets can only be claimed after the event has concluded, typically some hours after the match.

To claim winnings, the `claimWinnings` method needs to be called. This method takes only one argument: `uint256 _betId`.

### Finalizing the Results

To get the results of the match, the `finalizeMatch` method must be called. This method requires the Merkle proof as input, which is provided by the attestation provider.

### Other Methods

The contract contains methods for retrieving data. These methods are primarily intended for the front end to receive the data:

- `getEventChoiceData(bytes32 uuid, uint32 _choice)`
- `getEvents(bytes32[] memory uids)`
- `getBetsByEvent(bytes32 uuid)`
- `getBetsByDateFromTo(uint256 date, uint256 from, uint256 to)`
- `getBetsByDate(uint256 date)`
- `getBetsByUserFromTo(address user, uint256 from, uint256 to)`
- `getBetsByUser(address user)`
- `betsByUserLength(address user)`
- `getBetsByDateAndUserFromTo(uint256 date, address user, uint256 from, uint256 to)`
- `getBetsByDateAndUser(uint256 date, address user)`
- `betsByDateAndUserLength(uint256 date, address user)`

## Resources

- [Flare Dev Docs](https://docs.flare.network/dev/)
- [Flare Data Connector](https://flare.network/dataconnector/)
- [Hardhat Docs](https://hardhat.org/docs)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
