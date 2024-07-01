// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract OIBetShowcase is AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint32 public feePercentage;

    // max bet is 100 songbird / flare
    uint256 public maxBet;
    uint256 private betId = 0;

    constructor() {
        // set defualt admin to owner
        address defaultAdmin = msg.sender;
        feePercentage = 5;
        maxBet = 100 ether;
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
    }

    struct SportEvent {
        bytes32 uuid;
        string title;
        uint256 startTime;
        uint32 duration;
        string sport;
        uint256 poolSize;
        uint32 winner;
        Choices[] choices;
    }

    struct Choices {
        uint32 choiceId;
        string choiceName;
        uint256 totalBets;
        uint32 currentMultiplier;
    }

    struct Bet {
        uint256 id;
        bytes32 eventUUID;
        address bettor;
        uint256 betAmount;
        uint256 winMultiplier;
        uint256 betTimestamp;
        uint16 betChoice;
    }

    mapping(bytes32 => SportEvent) public sportEvents;
    mapping(uint256 => SportEvent[]) public sportEventsByDate;
    mapping(uint256 => mapping(string => SportEvent[]))
        public sportEventsByDateAndSport;
    mapping(uint256 => Bet[]) public betsByEventStartDate;
    mapping(bytes32 => Bet[]) public betsByEvent;
    mapping(uint256 => Bet[]) public betsById;

    event SportEventCreated(bytes32 uuid, string title, uint256 startTime);
    event BetPlaced(
        uint256 id,
        bytes32 eventUUID,
        address bettor,
        uint256 amount,
        uint16 choice
    );
    event BetSettled(bytes32 eventUUID, uint32 winner, uint256 winMultiplier);

    function createSportEvent(
        string memory title,
        uint256 startTime,
        uint32 duration,
        string memory sport,
        string memory choiceA,
        string memory choiceB,
        string memory choiceC,
        uint32 initialVotesA,
        uint32 initialVotesB,
        uint32 initialVotesC,
        uint256 initialPool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 uuid = generateUUID(title, startTime);
        require(sportEvents[uuid].uuid == 0, "Event already exists");
        SportEvent storage ev = sportEvents[uuid];
        ev.uuid = uuid;
        ev.title = title;

      
        ev.choices.push(
            Choices({
                choiceId: 1,
                choiceName: choiceA,
                totalBets: initialVotesA,
                currentMultiplier: getMultiplier(initialVotesA, initialVotesA + initialVotesB + initialVotesC)
            })
        );
        ev.choices.push(
            Choices({
                choiceId: 2,
                choiceName: choiceB,
                totalBets: initialVotesB,
                currentMultiplier: getMultiplier(initialVotesB, initialVotesA + initialVotesB + initialVotesC)
            })
        );
        ev.choices.push(
            Choices({
                choiceId: 3,
                choiceName: choiceC,
                totalBets: initialVotesC,
                currentMultiplier: getMultiplier(initialVotesC, initialVotesA + initialVotesB + initialVotesC)
            })
        );
        ev.startTime = startTime;
        ev.duration = duration;
        ev.sport = sport;
        ev.poolSize = initialPool;

        sportEventsByDate[roundTimestampToDay(startTime)].push(ev);
        sportEventsByDateAndSport[roundTimestampToDay(startTime)][sport].push(
            ev
        );

        emit SportEventCreated(uuid, title, startTime);
    }

    function getSportEventsByDate(
        uint256 date
    ) external view returns (SportEvent[] memory) {
        return sportEventsByDate[date];
    }

    function getSportEventsByDateAndSport(
        uint256 date,
        string memory sport
    ) external view returns (SportEvent[] memory) {
        return sportEventsByDateAndSport[date][sport];
    }

    function getSportEventFromUUID(
        bytes32 uuid
    ) external view returns (SportEvent memory) {
        return sportEvents[uuid];
    }

    //TODO: Implement the betting logic
    function placeBet(bytes32 eventUUID, uint16 choice) external payable {
        uint256 amount = msg.value;
        require(amount <= maxBet, "Bet amount exceeds max bet");
        require(amount > 0, "Bet amount must be greater than 0");

        SportEvent storage currentEvent = sportEvents[eventUUID];
        require(currentEvent.uuid != 0, "Event does not exist");
        require(
            currentEvent.startTime < block.timestamp,
            "Event not started yet"
        );

        betId++;

        Bet memory bet = Bet({
            id: betId,
            eventUUID: eventUUID,
            bettor: msg.sender,
            betAmount: amount,
            winMultiplier: 0,
            betTimestamp: block.timestamp,
            betChoice: choice
        });
        currentEvent.poolSize += amount;
        currentEvent.choices[choice].totalBets + 1;

        betsByEventStartDate[roundTimestampToDay(block.timestamp)].push(bet);
        betsByEvent[eventUUID].push(bet);
        betsById[betId].push(bet);

        emit BetPlaced(betId, eventUUID, msg.sender, amount, choice);
    }

    //TODO: This is just a mockup, implement the logic to settle the bet
    function claimWinnings(uint256 betId) external {
        Bet[] storage bets = betsById[betId];
        require(bets.length > 0, "Bet does not exist");
        Bet storage bet = bets[0];
        require(bet.bettor == msg.sender, "You are not the bettor");
        require(bet.winMultiplier > 0, "Bet has not been settled yet");

        uint256 winnings = bet.betAmount * bet.winMultiplier;
        payable(msg.sender).transfer(winnings);

        emit BetSettled(
            bet.eventUUID,
            sportEvents[bet.eventUUID].winner,
            bet.winMultiplier
        );
    }

    function getBetsByDate(uint256 date) external view returns (Bet[] memory) {
        return betsByEventStartDate[date];
    }

    function roundTimestampToDay(
        uint256 timestamp
    ) private pure returns (uint256) {
        return timestamp - (timestamp % 86400);
    }

    //TODO: This is just a mockup, need to be propely implemented
    function getMultiplier(
        uint32 choiceVotes,
        uint32 totalVotes
    ) private pure returns (uint32) {
        uint32 safetyFactor = 133;
        uint32 chance = ((totalVotes) / choiceVotes) * 10000 / safetyFactor;
        return chance;
    }

    function generateUUID(
        string memory title,
        uint256 startTime
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(block.timestamp, msg.sender, title, startTime)
            );
    }
}
