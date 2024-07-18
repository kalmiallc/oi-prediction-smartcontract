// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./attestationType/MatchResult.sol";

interface IMatchResultVerification {
    function verifyMatchResult(MatchResult.Proof calldata proof) external view returns (bool);
}

contract OIBetShowcase is Ownable {
    uint256 public constant DAY = 86400;
    uint256 public constant MULTIPLIER_FACTOR = 1000;

    // max bet is 100 songbird / flare
    uint256 private maxBet;
    uint256 public betId = 0;
    bool public isProduction = true;

    IMatchResultVerification public verification;

    /**
     * @dev Mapping of addresses that are authorized to add mint new tokens.
     */
    mapping (address => bool) public authorizedAddresses;

    /**
     * @dev Only authorized addresses can call a function with this modifier.
     */
    modifier onlyAuthorized() {
        require(authorizedAddresses[msg.sender] || owner() == msg.sender, "Not authorized");
        _;
    }

    constructor(address _verification) {
        maxBet = 100 ether;
        verification = IMatchResultVerification(_verification);
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
        uint8 gender;
        bool cancelled;
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
    mapping(bytes32 => bool) public eventRefund; // is event in refund state
    mapping(Sports => bytes32[]) public sportEventsBySport;
    mapping(uint256 => mapping(Sports => bytes32[]))
        public sportEventsByDateAndSport;

    mapping(uint256 => uint256[]) public betsByEventStartDate;
    mapping(uint256 => mapping(address => uint256[])) public betsByDateAndUser;
    mapping(bytes32 => uint256[]) public betsByEvent;
    mapping(address => uint256[]) public betsByUser;
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
    event BetRefunded(bytes32 eventUID);

    function createSportEvent(
        string memory title,
        uint256 startTime,
        uint8 gender,
        Sports sport,
        string[] memory choices,
        uint32[] memory initialVotes,
        uint256 initialPool,
        bytes32 _uid
    ) external payable onlyAuthorized() {
        bytes32 uid = generateUID(sport, gender, startTime, title);
        require(uid == _uid, "UID mismatch");
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

        ev.poolAmount = initialPool;
        ev.startTime = startTime;
        ev.sport = sport;
        ev.cancelled = false;

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

        sportEventsBySport[sport].push(ev.uid);
        sportEventsByDateAndSport[roundTimestampToDay(ev.startTime)][sport].push(ev.uid);

        emit SportEventCreated(uid, ev.title, ev.sport, ev.startTime);
    }

    function cancelSportEvent(bytes32 _uid) external onlyAuthorized() {
        SportEvent storage ev = sportEvents[_uid];
        require(ev.uid != 0, "Event does not exist");
        require(ev.winner == 0, "Result already drawn");
        ev.cancelled = true;
    }

    function getSportEventsByDateAndSport(
        uint256 date,
        Sports sport
    ) external view returns (SportEvent[] memory) {
        uint256 len = sportEventsByDateAndSport[date][sport].length;
        SportEvent[] memory events = new SportEvent[](len);
        
        for (uint256 i = 0; i < len; i++) {
            events[i] = sportEvents[sportEventsByDateAndSport[date][sport][i]];
        }
        return events;
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
        require(!eventRefund[currentEvent.uid], "Event in refund state");
        require(!currentEvent.cancelled, "Event cancelled");
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
        }
        
        betsByUser[msg.sender].push(bet.id);
        betsByEventStartDate[dayStart].push(bet.id);
        betsByDateAndUser[dayStart][msg.sender].push(bet.id);

        betsByEvent[eventUID].push(bet.id);
        betById[bet.id] = bet;

        emit BetPlaced(bet.id, eventUID, msg.sender, amount, choice);
    }

    function claimWinnings(uint256 _betId) external {
        Bet storage bet = betById[_betId];
        require(bet.winMultiplier > 0, "Invalid betId");
        require(bet.bettor == msg.sender, "You are not the bettor");
        SportEvent memory sportEvent = sportEvents[bet.eventUID];
        require(sportEvent.uid != 0, "Event does not exist");
        require(sportEvent.winner > 0, "Result not drawn");
        require(!eventRefund[sportEvent.uid], "Event in refund state");
        require(!sportEvent.cancelled, "Event cancelled");

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

    function refund(uint256 _betId) external {
        Bet storage bet = betById[_betId];
        require(bet.winMultiplier > 0, "Invalid betId");
        require(bet.bettor == msg.sender, "You are not the bettor");
        SportEvent memory sportEvent = sportEvents[bet.eventUID];
        require(sportEvent.uid != 0, "Event does not exist");
        require(sportEvent.winner == 0, "Result already drawn");

        require(!bet.claimed, "Refund already claimed");

        require(
            sportEvent.cancelled || sportEvent.startTime + DAY * 14 < block.timestamp,
            "Refund only for cancelled or 14 days after event startTime (if winner not set)"
        );

        bet.claimed = true;
        eventRefund[sportEvent.uid] = true;
        payable(msg.sender).transfer(bet.betAmount);

        emit BetRefunded(bet.eventUID);
    }

    /**
     * @dev Events specific choice data
     */
    function getEventChoiceData(bytes32 uuid, uint32 _choice) external view returns (Choices memory) {
        return sportEvents[uuid].choices[_choice];
    }

    /**
     * @dev Events by uids
     */
    function getEvents(bytes32[] memory uids) external view returns (SportEvent[] memory) {
        SportEvent[] memory events = new SportEvent[](uids.length);
        
        for (uint256 i = 0; i < uids.length; i++) {
            events[i] = sportEvents[uids[i]];
        }
        return events;
    }

    /**
     * @dev Events by sport
     */
    function getSportEventsBySportFromTo(Sports sport, uint256 from, uint256 to) public view returns (SportEvent[] memory) {
        uint256 cnt = to - from;
        SportEvent[] memory events = new SportEvent[](cnt);
        for (uint256 i = 0; i < cnt; i++) {
            events[i] = sportEvents[sportEventsBySport[sport][from + i]];
        }
        return events;
    }

    function getSportEventsBySport(Sports sport) external view returns (SportEvent[] memory) {
        return getSportEventsBySportFromTo(sport, 0, sportEventsBySport[sport].length);
    }

    function sportEventsBySportLength(Sports sport) external view returns (uint256) {
        return sportEventsBySport[sport].length;
    }

    /**
     * @dev Bets by event
     */
    function getBetsByEvent(bytes32 uuid) external view returns (Bet[] memory) {
        Bet[] memory bets = new Bet[](betsByEvent[uuid].length);
        for (uint256 i = 0; i < betsByEvent[uuid].length; i++) {
            bets[i] = betById[betsByEvent[uuid][i]];
        }
        return bets;
    }

    /**
     * @dev Bets by date
     */
    function getBetsByDateFromTo(uint256 date, uint256 from, uint256 to) public view returns (Bet[] memory) {
        uint256 cnt = to - from;
        Bet[] memory bets = new Bet[](cnt);
        for (uint256 i = 0; i < cnt; i++) {
            bets[i] = betById[betsByEventStartDate[date][from + i]];
        }
        return bets;
    }

    function getBetsByDate(uint256 date) external view returns (Bet[] memory) {
        return getBetsByDateFromTo(date, 0, betsByEventStartDate[date].length);
    }

    function betsByEventStartDateLength(uint256 date) external view returns (uint256) {
        return betsByEventStartDate[date].length;
    }

    /**
     * @dev Bets by user
     */
    function getBetsByUserFromTo(address user, uint256 from, uint256 to) public view returns (Bet[] memory) {
        uint256 cnt = to - from;
        Bet[] memory bets = new Bet[](cnt);
        for (uint256 i = 0; i < cnt; i++) {
            bets[i] = betById[betsByUser[user][from + i]];
        }
        return bets;
    }

    function getBetsByUser(address user) external view returns (Bet[] memory) {
        return getBetsByUserFromTo(user, 0, betsByUser[user].length);
    }

    function betsByUserLength(address user) external view returns (uint256) {
        return betsByUser[user].length;
    }

    /**
     * @dev Bets by date and user
     */
    function getBetsByDateAndUserFromTo(uint256 date, address user, uint256 from, uint256 to) public view returns (Bet[] memory) {
        uint256 cnt = to - from;
        Bet[] memory bets = new Bet[](cnt);
        for (uint256 i = 0; i < cnt; i++) {
            bets[i] = betById[betsByDateAndUser[date][user][from + i]];
        }
        return bets;
    }

    function getBetsByDateAndUser(uint256 date, address user) external view returns (Bet[] memory) {
        return getBetsByDateAndUserFromTo(date, user, 0, betsByDateAndUser[date][user].length);
    }

    function betsByDateAndUserLength(uint256 date, address user) external view returns (uint256) {
        return betsByDateAndUser[date][user].length;
    }

    /**
     * @dev Calculate approximate bet return
     */
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
        Sports sport,
        uint8 gender,
        uint256 startTime,
        string memory title
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(sport, gender, startTime, title));
    }

    function checkResultHash(
        uint8 result,
        uint256 requestNumber,
        bytes32 uid,
        bytes32 resultHash
    ) public pure returns (bool) {
        return resultHash == keccak256(abi.encodePacked(uid, requestNumber, result));
    }

    function finalizeMatch(MatchResult.Proof calldata proof) external {
        // Check with state connector
        require(
            verification.verifyMatchResult(proof),
            "MatchResult is not confirmed by the State Connector"
        );

        bytes32 uid = generateUID(
            Sports(proof.data.requestBody.sport),
            proof.data.requestBody.gender,
            proof.data.requestBody.date,
            proof.data.requestBody.teams
        );

        SportEvent storage sportEvent = sportEvents[uid];
        require(sportEvent.uid != 0, "Event does not exist");
        require(sportEvent.winner == 0, "Result already drawn");

        // TODO: Maybe also check if result is a valid option

        sportEvent.winner = proof.data.responseBody.result;
    }

    function flipIsProduction() external onlyOwner {
        isProduction = !isProduction;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(!isProduction, "Cannot withdraw in production mode");
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Sets or revokes authorized address.
     * @param addr Address we are setting.
     * @param isAuthorized True is setting, false if we are revoking.
     */
    function setAuthorizedAddress(address addr, bool isAuthorized)
        external
        onlyOwner()
    {
        authorizedAddresses[addr] = isAuthorized;
    }


    // ONLY FOR DEBUGGING !!!
    // ONLY FOR DEBUGGING !!!
    // ONLY FOR DEBUGGING !!!
    function setWinner(bytes32 uid, uint16 choice) external onlyOwner {
        sportEvents[uid].winner = choice;
    }
}