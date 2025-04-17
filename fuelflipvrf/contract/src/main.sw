contract;

mod error;

use std::{
    auth::msg_sender,
    b512::B512,
    call_frames::msg_asset_id,
    constants::{
        ZERO_B256,
    },
    context::{
        msg_amount,
        this_balance,
    },
    asset::transfer,
    identity::Identity,
    logging::log,
    revert::revert,
    storage::*,
    storage::storage_vec::*,
};
use std::hash::Hash;

use vrf_abi::{randomness::{Fulfilled, Randomness, RandomnessState}, Vrf, Consumer};

const VRF_ID = 0xf0b0fcded2b3dcbc529d611300b904df97bf473240ce4679993e418b36b3e8d0;
const FUEL_ASSET_ID = AssetId::from(0x1d5d97005e41cae2187a895fd8eab0506111e0e2f3331cd3912c15c24e3c1d82);

// Change this to the actual owner(deployer) address
const OWNER_ADDRESS = Address::from(0x68D4c28F65cf6d91CB3bd5dd590C6C0cF344F42c3010912FE4ac278F969ebE3C);

pub enum Error {
    OnlyVrfCanFulfill: (),
    UnknownSeed: (),
    HistoryErr: (),
    InvalidAmount: (),
}

pub enum Notifications {
    FlipCreated: CoinFlip,
    FlipFulfilled: CoinFlip,
}

abi ComradeFlip {
    fn round_cost() -> u64;
    fn withdraw(asset_id: AssetId, amount: u64);
    #[storage(read, write)]
    fn fallback_fulfill(seed: b256, randomness: B512);
    #[storage(read, write)]
    fn set_min_bet(min_bet: u64);
    #[storage(read, write)]
    fn set_max_bet(max_bet: u64);
    #[storage(read)]
    fn get_flip_counter() -> u64;
    #[storage(read)]
    fn get_seed_by_counter(counter: u64) -> b256;
    #[storage(read)]
    fn get_flip_by_counter(counter: u64) -> CoinFlip;
    #[storage(read)]
    fn get_history() -> Vec<CoinFlip>;
    #[payable]
    #[storage(read, write)]
    fn flip_coin(force: b256, timestamp: u64, side_chosen: bool) -> u64;
    
}

struct CoinFlip {
    amount: u64,
    fee: u64,
    side_chosen: bool,
    user: Identity,
    timestamp: u64,
    outcome: u64,
}

enum PlayerState {
    InProgress: b256,
    Free: u64,
}

storage {
    flip_state: StorageMap<u64, CoinFlip> = StorageMap {},
    flip_counter: u64 = 0,
    min_bet: u64 = 1000000000000,
    max_bet: u64 = 25000000000000,
    force_map: StorageMap<b256, u64> = StorageMap {},
    seed_map: StorageMap<u64, b256> = StorageMap {},
}

fn only_vrf() {
    let vrf_id = Identity::ContractId(ContractId::from(VRF_ID));
    if msg_sender().unwrap() != vrf_id {
        log(Error::OnlyVrfCanFulfill);
        revert(3);
    }
}
impl Consumer for Contract {
    #[storage(read, write)]
    fn fulfill_randomness(seed: b256, randomness: B512) {
        // Restrict access to only the VRF contract
        only_vrf();
        let flip_counter = storage.force_map.get(seed).try_read().unwrap();
        let mut flip = match storage.flip_state.get(flip_counter).try_read() {
            Some(flip) => flip,
            None => {
                log(Error::UnknownSeed);
                revert(3);
            },
        };
        // roughly 1/2 chance
        let state: u64 = if randomness.bits()[0] <= 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff {
            2
        } else {
            1
        };
        flip.outcome = state;
        storage.flip_state.insert(flip_counter, flip);

        let sending_amount = flip.amount * 2;
        let fee = sending_amount / 50;
        let amount_after_fee = sending_amount - fee;
        if flip.outcome == 1 {
            transfer(flip.user, FUEL_ASSET_ID, amount_after_fee);
        }
        log(Notifications::FlipFulfilled(flip));
    }
}

impl ComradeFlip for Contract {
    fn round_cost() -> u64 {
        abi(Vrf, VRF_ID).get_fee(AssetId::base())
    }    
    // Fallback fulfill incase the VRF contract is down
    #[storage(read, write)]
    fn fallback_fulfill(seed: b256, randomness: B512) {
        let authorized_address: Identity = Identity::Address(OWNER_ADDRESS);
        let sender = msg_sender().unwrap();
        require(sender == authorized_address, "Unauthorized access");        
        let flip_counter = storage.force_map.get(seed).try_read().unwrap();
        let mut flip = match storage.flip_state.get(flip_counter).try_read() {
            Some(flip) => flip,
            None => {
                log(Error::UnknownSeed);
                revert(3);
            },
        };
        // roughly 1/2 chance
        let state: u64 = if randomness.bits()[0] <= 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff {
            2
        } else {
            1
        };
        flip.outcome = state;
        storage.flip_state.insert(flip_counter, flip);

        let sending_amount = flip.amount * 2;
        let fee = sending_amount / 50;
        let amount_after_fee = sending_amount - fee;
        if flip.outcome == 1 {
            transfer(flip.user, FUEL_ASSET_ID, amount_after_fee);
        }
        log(Notifications::FlipFulfilled(flip));
    }
    #[storage(read, write)]
    fn set_min_bet(min_bet: u64) {
        let authorized_address: Identity = Identity::Address(OWNER_ADDRESS);
        let sender = msg_sender().unwrap();
        require(sender == authorized_address, "Unauthorized access");
        storage.min_bet.write(min_bet);
    }
    #[storage(read, write)]
    fn set_max_bet(max_bet: u64) {
        let authorized_address: Identity = Identity::Address(OWNER_ADDRESS);
        let sender = msg_sender().unwrap();
        require(sender == authorized_address, "Unauthorized access");
        storage.max_bet.write(max_bet);
    }
    
    fn withdraw(asset_id: AssetId, amount: u64) {

        let authorized_address: Identity = Identity::Address(OWNER_ADDRESS);
        let sender = msg_sender().unwrap();
        require(sender == authorized_address, "Unauthorized access");
        require(this_balance(asset_id) >= amount, "Insufficient balance");
        transfer(sender, asset_id, amount);
    }
    #[storage(read)]
    fn get_flip_counter() -> u64 {
        storage.flip_counter.try_read().unwrap()
    }

    #[storage(read)]
    fn get_seed_by_counter(counter: u64) -> b256 {
        let authorized_address: Identity = Identity::Address(OWNER_ADDRESS);
        let sender = msg_sender().unwrap();
        require(sender == authorized_address, "Unauthorized access"); 
        storage.seed_map.get(counter).try_read().unwrap()
    }

    #[storage(read)]
    fn get_flip_by_counter(counter: u64) -> CoinFlip {
        match storage.flip_state.get(counter).try_read() {
            Some(flip) => flip,
            None => {
                log(Error::UnknownSeed);
                revert(3);
            },
        }
    }

    #[storage(read)]
    fn get_history() -> Vec<CoinFlip> {
        let mut flips = Vec::new();
        let counter = storage.flip_counter.try_read().unwrap();
        if counter < 0 {
            return flips;
        }
        let mut i = counter;
        while (i > 0) {
            let flip = storage.flip_state.get(i - 1).try_read();
            if let Some(flip) = flip {
                flips.push(flip);
            }
            if flips.len() == 10 {
                break;
            }
            if i == 0 {
                break;
            }
            else {
                i -= 1;
            }
        }
        flips
    }

    #[payable]
    #[storage(read, write)]
    fn flip_coin(force: b256, timestamp: u64, side_chosen: bool) -> u64 {
        let sender = msg_sender().unwrap();
        let amount = msg_amount();
        let asset_id = msg_asset_id();
        let contract_balance = this_balance(FUEL_ASSET_ID);
        let min_bet = storage.min_bet.try_read().unwrap();
        let max_bet = storage.max_bet.try_read().unwrap();
        require(asset_id == FUEL_ASSET_ID, "Invalid asset");
        require(contract_balance >= 2*amount, "Insufficient contract balance");
        require(amount >= min_bet, "Minimum bet amount is 1000 FUEL");
        require(amount <= max_bet, "Maximum bet amount is 25000 FUEL");
        let flip = CoinFlip {
            amount: amount,
            fee: 0,
            side_chosen: side_chosen,
            user: sender,
            timestamp: timestamp,
            outcome: 0,
        };
        let counter = storage.flip_counter.try_read().unwrap();
        storage.flip_state.insert(counter, flip);
        storage.force_map.insert(force, counter);
        storage.seed_map.insert(counter, force);
        let new_counter = counter + 1;
        storage.flip_counter.write(new_counter);
        let vrf = abi(Vrf, VRF_ID);
        let fee = vrf.get_fee(AssetId::base());
        let _ = vrf.request {
            asset_id: AssetId::base().bits(),
            coins: 2*fee,
        }(force);
        log(Notifications::FlipCreated(flip));
        new_counter
    }
}