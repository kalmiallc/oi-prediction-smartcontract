// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract OIBetShowcase is AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");



    // max bet is 100 songbird / flare
    uint256 private maxBet;
    uint256 private betId = 0;

    constructor() {
        // set defualt admin to owner
        address defaultAdmin = msg.sender;
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
        uint256 poolAmount;
        uint32 winner;
        Choices[] choices;
    }

    struct Choices {
        uint32 choiceId;
        string choiceName;
        uint256 totalBetsAmount;
        uint256 currentMultiplier;
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
    mapping(uint256 => mapping(string => SportEvent[]))
        public sportEventsByDateAndSport;
    mapping(uint256 => Bet[]) public betsByEventStartDate;
    mapping(bytes32 => Bet[]) public betsByEvent;
    mapping(uint256 => Bet[]) public betsById;

    event SportEventCreated(bytes32 uuid, string title, string sport, uint256 startTime);
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

        // // devide the pool amount by the number of choices
        ev.poolAmount = initialPool;
        ev.startTime = startTime;
        ev.duration = duration;
        ev.sport = sport;
        
        ev.choices.push(
            Choices({
                choiceId: 1,
                choiceName: choiceA,
                totalBetsAmount: calculateInitialBetAmount(initialPool, initialVotesA + initialVotesB + initialVotesC, initialVotesA),
                currentMultiplier: calculateMultiplier(calculateInitialBetAmount(initialPool, initialVotesA + initialVotesB + initialVotesC, initialVotesA), initialPool)
            })
        );
        ev.choices.push(
            Choices({
                choiceId: 2,
                choiceName: choiceB,
                totalBetsAmount: calculateInitialBetAmount(initialPool, initialVotesA + initialVotesB + initialVotesC, initialVotesB),
                currentMultiplier: calculateMultiplier(calculateInitialBetAmount(initialPool, initialVotesA + initialVotesB + initialVotesC, initialVotesB), initialPool)
            })
        );
        ev.choices.push(
            Choices({
                choiceId: 3,
                choiceName: choiceC,
                totalBetsAmount: calculateInitialBetAmount(initialPool, initialVotesA + initialVotesB + initialVotesC, initialVotesC),
                currentMultiplier: calculateMultiplier(calculateInitialBetAmount(initialPool, initialVotesA + initialVotesB + initialVotesC, initialVotesC), initialPool)
            })
        );
   
        
        sportEventsByDateAndSport[roundTimestampToDay(startTime)][sport].push(
            ev
        ); 

        emit SportEventCreated(uuid, title, sport, startTime); 
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

    //TODO: Check the betting logic
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

        // for the multiplier, we first need to add the amount to the pool, and add to the total bets ammount for the choice
        currentEvent.poolAmount += amount;
        uint256 multiplier = calculateMultiplier(
            currentEvent.choices[choice].totalBetsAmount + amount,
            currentEvent.poolAmount
        );
        
        Bet memory bet = Bet({
            id: betId,
            eventUUID: eventUUID,
            bettor: msg.sender,
            betAmount: amount,
            winMultiplier: multiplier,
            betTimestamp: block.timestamp,
            betChoice: choice
        });

        // choice amount is multiplied
        uint256 totalChoiceAmount = currentEvent.choices[choice].totalBetsAmount + (amount * multiplier / 1000);

        require(
            currentEvent.choices[choice].totalBetsAmount + totalChoiceAmount  <= currentEvent.poolAmount,
            "Total bets amount exceeds pool amount"
        );
        currentEvent.choices[choice].totalBetsAmount += totalChoiceAmount;
        
        // recalculate choices
        for (uint256 i = 0; i < currentEvent.choices.length; i++) {
                currentEvent.choices[i].currentMultiplier = calculateMultiplier(
                    currentEvent.choices[i].totalBetsAmount,
                    currentEvent.poolAmount
                );
                // handle also events by data and sport mapping 
                sportEventsByDateAndSport[roundTimestampToDay(currentEvent.startTime)][currentEvent.sport][0].choices[i].currentMultiplier = currentEvent.choices[i].currentMultiplier;
                sportEventsByDateAndSport[roundTimestampToDay(currentEvent.startTime)][currentEvent.sport][0].choices[i].totalBetsAmount = currentEvent.choices[i].totalBetsAmount;
        }
         
        
        sportEventsByDateAndSport[roundTimestampToDay(currentEvent.startTime)][currentEvent.sport][0].poolAmount += amount;   
        
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

    function calculateAproximateBetAmount(
        uint256 amount,
        uint32 choiceId,
        bytes32 eventUUID
    ) public view returns (uint256) {
        SportEvent storage currentEvent = sportEvents[eventUUID];
        require(currentEvent.uuid != 0, "Event does not exist");
        require(
            currentEvent.startTime < block.timestamp,
            "Event not started yet"
        );

        uint256 totalChoiceAmount = currentEvent.choices[choiceId].totalBetsAmount + amount;
        uint256 totalPoolAmount = currentEvent.poolAmount;
        uint256 multiplier = calculateMultiplier(totalChoiceAmount, totalPoolAmount);
        return amount * multiplier;
    }
    


    function roundTimestampToDay(
        uint256 timestamp
    ) private pure returns (uint256) {
        return timestamp - (timestamp % 86400);
    }

    //TODO: Need to test and check if the logic is correct
    function calculateMultiplier(
        uint256 totalChoiceAmount,
        uint256 totalPoolAmount
    ) private pure returns (uint256) {
        uint32  feePercentage = 5;
        uint32 safetyFactor = 105;
        uint256 totalChoiceAmountWithFee = totalChoiceAmount + (feePercentage * totalChoiceAmount / 100);
        require(totalPoolAmount > 0, "Pool amount must be greater than 0");
        require(totalChoiceAmount > 0, "Choice amount must be greater than 0");
        require(totalPoolAmount >= totalChoiceAmountWithFee , "Pool amount must be greater than choice amount");
        
        // the multipiler is a factor of 1000
        uint256 multiplier = ((totalPoolAmount * 100000 / safetyFactor) / (totalChoiceAmountWithFee)); 
        // new total choice amount cannot be bigger than the total pool amount
        require(totalPoolAmount >= totalChoiceAmount * multiplier / 1000, "Pool amount must be greater than choice amount");       
        return multiplier;
    }

    function calculateInitialBetAmount(
        uint256 initialPool,
        uint256 sumOfVotes,
        uint256 choiceVotes
    ) private pure returns (uint256) {
        return (((initialPool) / sumOfVotes) * choiceVotes);
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
