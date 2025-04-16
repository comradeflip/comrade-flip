## Data
- <seed, flipItem> // seed to flipItem
- <player, seed> // enables player can play once at a time, hence 0
- flipItem[] // global history of shitz
-----
flipItem:
- blockHeight
- amount
- fee
- Identity
- chosen
- status (0/1/2)

## Functions
-> read: getFlip, getHistory
-> write: flipCoin



enum RoundOutcome {
    Bang: (),
    Click: ()
}


impl RoundOutcome {
    fn derive(random: B512) -> Self {
        // roughly 1/2 chance
        log("hello");
        if random.bits()[0] <= 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        {
            RoundOutcome::Bang
        } else {
            RoundOutcome::Click
        }
    }
}