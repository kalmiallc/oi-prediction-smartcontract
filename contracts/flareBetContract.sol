// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OIBetShowcase is Ownable {
    uint256 public constant DAY = 86400;
    uint256 public constant MULTIPLIER_FACTOR = 1000;

    // max bet is 100 songbird / flare
    uint256 private maxBet;
    uint256 public betId = 0;

    constructor() {
        maxBet = 100 ether;
    }

    enum Sports {
        Basketball,
        Basketball3x3,
        Badminton,
        BeachVolley,
        FieldHockey,
        Football,
        Handball,
        TableTennis,
        Tennis,
        Volleyball,
        WaterPolo
    }

    struct SportEvent {
        bytes32 uid;
        string title;
        uint256 startTime;
        Sports sport;
        uint256 poolAmount;
        uint16 winner;
        Choices[] choices;
    }

    struct Choices {
        uint16 choiceId;
        string choiceName;
        uint256 totalBetsAmount;
        uint256 currentMultiplier;
    }

    struct Bet {
        uint256 id;
        bytes32 eventUID;
        address bettor;
        uint256 betAmount;
        uint256 winMultiplier;
        uint256 betTimestamp;
        uint16 betChoice;
        bool claimed;
    }

    mapping(bytes32 => SportEvent) public sportEvents;
    mapping(uint256 => mapping(Sports => SportEvent[]))
        public sportEventsByDateAndSport;
    mapping(uint256 => Bet[]) public betsByEventStartDate;
    mapping(uint256 => mapping(address => Bet[])) public betsByDateAndUser;
    mapping(bytes32 => Bet[]) public betsByEvent;
    mapping(uint256 => Bet) public betById;

    event SportEventCreated(bytes32 uid, string title, Sports sport, uint256 startTime);
    event BetPlaced(
        uint256 id,
        bytes32 eventUID,
        address bettor,
        uint256 amount,
        uint16 choice
    );
    event BetSettled(bytes32 eventUID, uint32 winner, uint256 winMultiplier);

    function createSportEvent(
        string memory title,
        uint256 startTime,
        Sports sport,
        string[] memory choices,
        uint32[] memory initialVotes,
        uint256 initialPool
    ) external payable onlyOwner {
        bytes32 uid = generateUID(title, startTime, sport);
        require(sportEvents[uid].uid == 0, "Event already exists");
        require(msg.value == initialPool, "msg.value != initialPool");
        require(
            choices.length == initialVotes.length, 
            "choices & initialVotes length mismatch"
        );
        require(
            choices.length == 2 || choices.length == 3,
            "choices length has to be 2 or 3"
        );
        SportEvent storage ev = sportEvents[uid];
        ev.uid = uid;
        ev.title = title;

        // divide the pool amount by the number of choices
        ev.poolAmount = initialPool;
        ev.startTime = startTime;
        ev.sport = sport;

        uint256 sumVotes;
        for (uint256 i = 0; i < initialVotes.length; i++) {
            sumVotes += initialVotes[i];
        }

        uint256 initialBetAmount;
        for (uint256 i = 0; i < choices.length; i++) {
            initialBetAmount = calculateInitialBetAmount(initialPool, sumVotes, initialVotes[i]);
            ev.choices.push(
                Choices({
                    choiceId: uint16(i + 1),
                    choiceName: choices[i],
                    totalBetsAmount: initialBetAmount,
                    currentMultiplier: calculateMultiplier(initialBetAmount, initialPool)
                })
            );
        }

        sportEventsByDateAndSport[roundTimestampToDay(ev.startTime)][sport].push(ev);

        emit SportEventCreated(uid, ev.title, ev.sport, ev.startTime);
    }

    function getSportEventsByDateAndSport(
        uint256 date,
        Sports sport
    ) external view returns (SportEvent[] memory) {
        return sportEventsByDateAndSport[date][sport];
    }

    function getSportEventFromUID(bytes32 uid) external view returns (SportEvent memory) {
        return sportEvents[uid];
    }

    function placeBet(bytes32 eventUID, uint16 choice) external payable {
        uint256 amount = msg.value;
        require(amount <= maxBet, "Bet amount exceeds max bet");
        require(amount > 0, "Bet amount must be greater than 0");

        SportEvent storage currentEvent = sportEvents[eventUID];
        require(currentEvent.uid != 0, "Event does not exist");
        require(
            currentEvent.startTime > block.timestamp,
            "Event already started"
        );
        require(
            choice < currentEvent.choices.length,
            "Invalid choice"
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
            eventUID: eventUID,
            bettor: msg.sender,
            betAmount: amount,
            winMultiplier: multiplier,
            betTimestamp: block.timestamp,
            betChoice: choice,
            claimed: false
        });

        // choice amount is multiplied
        uint256 totalChoiceAmount = currentEvent.choices[choice].totalBetsAmount +
            (amount * multiplier / MULTIPLIER_FACTOR);

        require(
            totalChoiceAmount <= currentEvent.poolAmount,
            "Total bets amount exceeds pool amount"
        );
        currentEvent.choices[choice].totalBetsAmount = totalChoiceAmount;

        uint256 dayStart = roundTimestampToDay(currentEvent.startTime);
        
        // recalculate choices
        for (uint256 i = 0; i < currentEvent.choices.length; i++) {
            currentEvent.choices[i].currentMultiplier = calculateMultiplier(
                currentEvent.choices[i].totalBetsAmount,
                currentEvent.poolAmount
            );
            // handle also events by data and sport mapping 
            sportEventsByDateAndSport[dayStart][currentEvent.sport][0].choices[i].currentMultiplier = currentEvent.choices[i].currentMultiplier;
            sportEventsByDateAndSport[dayStart][currentEvent.sport][0].choices[i].totalBetsAmount = currentEvent.choices[i].totalBetsAmount;
        }
         
        sportEventsByDateAndSport[dayStart][currentEvent.sport][0].poolAmount += amount;   
        
        betsByEventStartDate[dayStart].push(bet);
        betsByDateAndUser[dayStart][msg.sender].push(bet);

        betsByEvent[eventUID].push(bet);
        betById[betId] = bet;

        emit BetPlaced(betId, eventUID, msg.sender, amount, choice);
    }

    function claimWinnings(uint256 _betId) external {
        Bet storage bet = betById[_betId];
        require(bet.winMultiplier > 0, "Invalid betId");
        require(bet.bettor == msg.sender, "You are not the bettor");
        SportEvent memory sportEvent = sportEvents[bet.eventUID];
        require(sportEvent.uid != 0, "Event does not exist");
        require(sportEvent.winner > 0, "Result not drawn");

        require(
            sportEvent.winner == sportEvent.choices[bet.betChoice].choiceId, 
            "Not winner"
        );
        require(!bet.claimed, "Winnings already claimed");

        bet.claimed = true;
        uint256 winnings = bet.betAmount * bet.winMultiplier / MULTIPLIER_FACTOR;
        payable(msg.sender).transfer(winnings);

        emit BetSettled(
            bet.eventUID,
            sportEvents[bet.eventUID].winner,
            bet.winMultiplier
        );
    }

    // ONLY FOR DEBUGGING !!!
    // ONLY FOR DEBUGGING !!!
    // ONLY FOR DEBUGGING !!!
    function setWinner(bytes32 uid, uint16 choice) external onlyOwner {
        sportEvents[uid].winner = choice;
    }

    function getEventChoiceData(bytes32 uuid, uint32 _choice) external view returns (Choices memory) {
        return sportEvents[uuid].choices[_choice];
    }

    function getEvents(bytes32[] memory uids) external view returns (SportEvent[] memory) {
        SportEvent[] memory events = new SportEvent[](uids.length);
        
        for (uint256 i = 0; i < uids.length; i++) {
            events[i] = sportEvents[uids[i]];
        }
        return events;
    }

    function getBetsByDate(uint256 date) external view returns (Bet[] memory) {
        return betsByEventStartDate[date];
    }

    function getBetsByEvent(bytes32 uuid) external view returns (Bet[] memory) {
        return betsByEvent[uuid];
    }

    function getBetsByDateAndUser(uint256 date, address user) external view returns (Bet[] memory) {
        return betsByDateAndUser[date][user];
    }

    function calculateAproximateBetReturn(
        uint256 amount,
        uint32 choiceId,
        bytes32 eventUID
    ) public view returns (uint256) {
        SportEvent storage currentEvent = sportEvents[eventUID];
        require(currentEvent.uid != 0, "Event does not exist");
        require(
            currentEvent.startTime > block.timestamp,
            "Event already started"
        );

        uint256 totalChoiceAmount = currentEvent.choices[choiceId].totalBetsAmount +
            amount;
        uint256 totalPoolAmount = currentEvent.poolAmount + amount;
        uint256 multiplier = calculateMultiplier(totalChoiceAmount, totalPoolAmount);
        return amount * multiplier / MULTIPLIER_FACTOR;
    }
    
    function roundTimestampToDay(uint256 timestamp) private pure returns (uint256) {
        return timestamp - (timestamp % DAY);
    }

    function calculateMultiplier(
        uint256 totalChoiceAmount,
        uint256 totalPoolAmount
    ) private pure returns (uint256) {
        uint8 adjustmentFactor = 101;
        require(totalPoolAmount > 0, "Pool amount must be greater than 0");
        require(totalChoiceAmount > 0, "Choice amount must be greater than 0");
        require(
            totalPoolAmount >= totalChoiceAmount,
            "Pool amount must be greater than choice amount"
        );
        // the multipiler is a factor of 1000
        uint256 multiplier = totalPoolAmount * MULTIPLIER_FACTOR * 100 / adjustmentFactor / totalChoiceAmount;
        // new total choice amount cannot be bigger than the total pool amount
        return multiplier;
    }

    function calculateInitialBetAmount(
        uint256 initialPool,
        uint256 sumOfVotes,
        uint256 choiceVotes
    ) private pure returns (uint256) {
        return initialPool / sumOfVotes * choiceVotes;
    }

    function generateUID(
        string memory title,
        uint256 startTime,
        Sports sport
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(title, sport, startTime));
    }

    function checkResultHash(
        uint8 result,
        uint256 requestNumber,
        bytes32 uid,
        bytes32 resultHash
    ) public pure returns (bool) {
        return resultHash == keccak256(abi.encodePacked(uid, requestNumber, result));
    }
}
