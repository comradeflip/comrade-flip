import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import goldCoin from "./assets/goldcoin.png";
import silverCoin from "./assets/silvercoin.png";
import WalletConnect from "./components/WalletConnect";
import { useIsConnected, useWallet, useBalance } from "@fuels/react";
import { Coinflip, VrfImpl } from "./sway-api";
import toast from "react-hot-toast";
import Balance from "./components/Balance";
import { BN, getRandomB256, Provider, AssetId, bn } from "fuels";
import propagandaBg from "./assets/backgroundmain.jpg";
import subject from "./assets/russian.png";
import { CoinFlipOutput } from "./sway-api/contracts/Coinflip";

interface FlipData {
  amount: string;
  side_chosen: boolean;
  user: {
    Address: {
      bits: string;
    };
  };
  timestamp: string;
  outcome: number;
}

function App() {
  const [selectedSide, setSelectedSide] = useState<"gold" | "silver" | null>(
    "gold"
  );
  const [isFlipping, setIsFlipping] = useState(false);
  const [isWaitingResult, setIsWaitingResult] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(1000);
  const isConnected = useIsConnected();
  const { wallet } = useWallet();

  const contractId =
    "0x55bb00e626f3380d5c78208cdca922671581f5140dc866724fe25504dcbe3c23";
  const ORAO_MAINNET_CONTRACT_ID =
    "0xf0b0fcded2b3dcbc529d611300b904df97bf473240ce4679993e418b36b3e8d0";
  const FUEL_ASSET_ID =
    "0x1d5d97005e41cae2187a895fd8eab0506111e0e2f3331cd3912c15c24e3c1d82";

  const contract = useMemo(() => {
    if (wallet) {
      const contract = new Coinflip(contractId, wallet);
      return contract;
    }
    return null;
  }, [wallet]);

  const [recentFlips, setRecentFlips] = useState<CoinFlipOutput[]>([]);
  const [finalCoinSide, setFinalCoinSide] = useState<"gold" | "silver" | null>(null);
  const [initialFlip, setInitialFlip] = useState(true);

  useEffect(() => {
    const fetchFlips = async () => {
        // const fuelProvider = new Provider("https://mainnet.fuel.network/v1/graphql");
        const fuelProvider = new Provider("https://mainnet.fuel.network/v1/graphql");
        const tester = new Coinflip(contractId, fuelProvider)
        const gg = await tester.functions.get_history().get()
        setRecentFlips(gg?.value ?? [])
    };

    fetchFlips();
    const interval = setInterval(fetchFlips, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setInitialFlip(false);
    }, 1000);
  }, []);

  const handleFlip = async () => {
    console.log("handleFlip");
    if (!isConnected || !wallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!selectedSide) {
      toast.error("Please select a side first");
      return;
    }

    if (betAmount < 1000) {
      toast.error("Minimum bet amount is 1000 FUEL");
      return;
    }
    const balance = await contract?.getBalance(FUEL_ASSET_ID as string)
    if (balance?.lt(bn.parseUnits((2 * betAmount).toString(), 9))) {
      toast.error("Insufficient contract balance");
      return;
    }

    const loadingToast = toast.loading("Flipping coin...");
    setIsFlipping(true);
    setIsWaitingResult(true);
    setFinalCoinSide(null);

    try {
      if (!wallet) {
        toast.error("Wallet not connected");
        return;
      }
      const vrf = new VrfImpl(ORAO_MAINNET_CONTRACT_ID, wallet);

      // const asset = await contract?.provider.getBaseAssetId();
      const callSeed = getRandomB256();
      // const ethAsset = {bits: asset}
      // const fee = await vrf.functions.get_fee(ethAsset as AssetId).get();
      const call_coin = await contract?.functions
        .flip_coin(callSeed, Date.now(), selectedSide === "gold")
        .callParams({
          forward: [bn.parseUnits(betAmount.toString(), 9), FUEL_ASSET_ID as string],
        })
        .addContracts([vrf])
        .call();

      const result = await call_coin?.waitForResult();
      toast.success("Submitted, waiting for result...");

      const checker = (result?.value?.toNumber() ?? 0) - 1;
      while (true) {
        const flip = await contract?.functions
          .get_flip_by_counter(checker)
          .get();
        if (!flip?.value.outcome.eqn(0)) {

          toast.dismiss(loadingToast);

          const userWon = flip?.value.outcome.eqn(1);
          const finalSide = userWon
            ? selectedSide
            : selectedSide === "gold"
            ? "silver"
            : "gold";

          setIsWaitingResult(false);

          await new Promise((resolve) => setTimeout(resolve, 500));
          setFinalCoinSide(finalSide);

          if (userWon) {
            const winMessages = [
              `The Party celebrates your victory of ${(betAmount * 2 * 98) / 100} FUEL, comrade!`,
              `Your ${(betAmount * 2 * 98) / 100} FUEL victory brings glory to the motherland!`,
              `The People's Coin has smiled upon you! ${(betAmount * 2 * 98) / 100} FUEL for the revolution!`,
              `By order of the Supreme Soviet, you receive ${(betAmount * 2 * 98) / 100} FUEL!`,
              `Your loyalty to the state has been rewarded with ${(betAmount * 2 * 98) / 100} FUEL!`,
              `A glorious victory worthy of the Red Square! ${(betAmount * 2 * 98) / 100} FUEL is yours!`
            ];
            const randomMessage = winMessages[Math.floor(Math.random() * winMessages.length)];
            toast.success(randomMessage);
          } else {
            const loseMessages = [
              "The State has determined your victory is not in line with the 5-year plan!",
              "Your loss serves the greater good, comrade!",
              "The People's Committee of Coin Flips has decided against you!",
              "Your wealth has been redistributed to the State!",
              "To lose is your duty to the motherland!",
              "Your sacrifice will be noted in the Great Book of Losses!",
              "The collective farm needs your FUEL more than you do!"
            ];
            const randomMessage = loseMessages[Math.floor(Math.random() * loseMessages.length)];
            toast.error(randomMessage);
          }
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Something went wrong!");
      console.error(error);
      setIsWaitingResult(false);
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: `url(${propagandaBg})`,
        backgroundSize: "cover",
        backgroundPosition: "top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="px-3 md:px-4 py-3 md:py-4 flex justify-between items-center z-10">
        <div className="flex flex-col items-start flex-wrap break-words z-10">
          <h1
            className="text-4xl md:text-6xl font-bold font-konstruktor text-[#000000] leading-none break-words"
            style={{
              WebkitTextStroke: "2px #FFCC57",
              filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))",
            }}
          >
            COMRADE FLIP
          </h1>
          <p
            className="text-3xl sm:text-xl hidden md:block font-bold font-konstruktor text-[#000000] leading-none uppercase -mt-3 z-10"
            style={{
              WebkitTextStroke: "1px #FFCC57",
              filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))",
            }}
          >
            Ethereum's Most Aligned Coin Flip
          </p>
        </div>
        <div className="flex gap-2 sm:gap-4 z-10">
          {/* <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-[#FFD700] hover:text-[#FFD700]/80 transition-colors duration-300"
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button> */}
          {isConnected && <Balance />}
          <WalletConnect />
        </div>
      </div>

      <main className="max-w-5xl md:max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 py-4 md:py-10">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex justify-center items-center relative mt-48 sm:mt-0">
            <img
              src={subject}
              alt="background"
              className="absolute w-[500px] md:w-[1200px] xl:w-[1400px] object-contain opacity-90 pointer-events-none"
              style={{
                transform: 'translate(-50%, -130%)',
                left: '50%',
                top: '50%',
              }}
            />

            <motion.div
              className="w-[208px] h-[208px] md:w-64 md:h-64 xl:w-72 xl:h-72 rounded-full bg-black/40 flex items-center justify-center relative shadow-[0_0_50px_rgba(255,0,255,0.15)] z-10"
              animate={{
                rotateY: initialFlip ? 360 : isWaitingResult ? 1440 : finalCoinSide === "silver" ? 180 : 0,
                scale: isFlipping ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: initialFlip ? 1 : isWaitingResult ? 2 : 0.5,
                ease: "easeInOut",
                repeat: isWaitingResult ? Infinity : 0,
              }}
              style={{
                transformStyle: "preserve-3d",
                perspective: "1000px",
              }}
            >
              <div className="absolute w-full h-full rounded-full backface-hidden">
                <img
                  src={goldCoin}
                  alt="Heads"
                  className="w-full h-full object-contain"
                />
              </div>
              <div
                className="absolute w-full h-full rounded-full backface-hidden"
                style={{ transform: "rotateY(180deg)" }}
              >
                <img
                  src={silverCoin}
                  alt="Tails"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          </div>
          <div className="bg-[#FF0000] p-8 relative border-8 border-[#FFCC57] flex flex-col items-center w-full">
            <h2
              className="text-4xl md:text-5xl font-bold font-konstruktor text-[#FFCC57] text-center mb-8"
              style={{
                WebkitTextStroke: "2px #000000",
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              }}
            >
              PICK YOUR SIDE
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-12 max-w-[260px] sm:max-w-[360px] mx-auto">
              {[
                { side: "gold", image: goldCoin },
                { side: "silver", image: silverCoin },
              ].map(({ side, image }) => (
                <motion.button
                  key={side}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{ scale: selectedSide === side ? 1.15 : 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedSide(side as "gold" | "silver")}
                  className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden mx-auto ${
                    selectedSide === side
                      ? "ring-4 ring-[#0066FF] ring-offset-2 ring-offset-[#FF0000]"
                      : ""
                  }`}
                >
                  <img
                    src={image}
                    alt={side}
                    className="w-full h-full object-contain"
                  />
                </motion.button>
              ))}
            </div>

            <h3
              className="text-4xl md:text-5xl font-bold font-konstruktor text-[#FFCC57] text-center mb-2 md:mb-3"
              style={{
                WebkitTextStroke: "2px #000000",
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              }}
            >
              WAGER
            </h3>

            <div
              className="text-3xl md:text-4xl font-bold font-konstruktor text-center mb-6 text-[#000000]"
              style={{
                WebkitTextStroke: "1px #FFCC57",
                filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))",
              }}
            >
              {betAmount} FUEL
            </div>

            <div className="relative mb-4 w-full">
              <input
                type="range"
                min={1000}
                max={25000}
                step={1000}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-full h-2 appearance-none bg-[#FFCC57]"
                style={{
                  background: "#FFCC57",
                  height: "4px",
                }}
              />
              <div className="flex justify-between mt-2">
                <span
                  className="text-xl font-bold font-konstruktor text-[#000000]"
                  style={{
                    WebkitTextStroke: "1px #FFCC57",
                  }}
                >
                  1000 FUEL
                </span>
                <span
                  className="text-xl font-bold font-konstruktor text-[#000000]"
                  style={{
                    WebkitTextStroke: "1px #FFCC57",
                  }}
                >
                  25000 FUEL
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                handleFlip();
              }}
              // disabled={
              //   !selectedSide || betAmount < 0.001 || isFlipping || !isConnected
              // }
              className="w-full bg-black border-4 border-[#FFCC57] py-4 mt-4 font-konstruktor flex items-center justify-center"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))",
              }}
            >
              <span className="text-xl md:text-2xl font-bold uppercase tracking-wider text-[#FFCC57] mt-1">
                {isFlipping ? "Flipping..." : "Double or Nothing"}
              </span>
            </motion.button>
          </div>
        </div>

        {/* History Table */}
        <div className="mt-8 sm:mt-12 bg-[#FF0000] p-4 md:p-8 border-8 border-[#FFCC57] relative overflow-hidden">
          <h2
            className="text-4xl md:text-5xl font-bold font-konstruktor text-[#FFCC57] text-center mb-4 md:mb-8"
            style={{
              WebkitTextStroke: "2px #000000",
              filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
            }}
          >
            RECENT FLIPS
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead className="text-xl md:text-2xl">
                <tr>
                  <th className="py-4 px-2 md:px-4 text-left">
                    <span
                      className="font-bold font-konstruktor text-[#000000]"
                      style={{ WebkitTextStroke: "1px #FFCC57" }}
                    >
                      TIME
                    </span>
                  </th>
                  <th className="py-4 pr-0 pl-4 text-left">
                    <span
                      className="font-bold font-konstruktor text-[#000000]"
                      style={{ WebkitTextStroke: "1px #FFCC57" }}
                    >
                      PLAYER
                    </span>
                  </th>
                  <th className="py-4 px-0 pr-8 text-center">
                    <span
                      className="font-bold font-konstruktor text-[#000000]"
                      style={{ WebkitTextStroke: "1px #FFCC57" }}
                    >
                      CHOSE
                    </span>
                  </th>
                  <th className="py-4 px-2 md:px-4 text-left">
                    <span
                      className="font-bold font-konstruktor text-[#000000]"
                      style={{ WebkitTextStroke: "1px #FFCC57" }}
                    >
                      WAGER
                    </span>
                  </th>
                  <th className="py-4 px-2 md:px-4 text-center">
                    <span
                      className="font-bold font-konstruktor text-[#000000]"
                      style={{ WebkitTextStroke: "1px #FFCC57" }}
                    >
                      OUTCOME
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-lg md:text-xl">
                {recentFlips.map((flip, index) => {
                  const timestamp = new Date(Number(flip.timestamp));
                  const timeAgo = Math.floor(
                    (Date.now() - timestamp.getTime()) / 60000
                  );
                  const amount = Number(flip.amount) / 1e9;

                  return (
                    <tr key={index}>
                      <td className="py-2.5 px-2 md:px-4">
                        <span className="font-bold font-konstruktor text-[#000000]">
                          {timeAgo < 60
                            ? `${timeAgo}m ago`
                            : timeAgo < 1440 // Less than 24 hours
                              ? `${Math.floor(timeAgo / 60)}h ago`
                              : `${Math.floor(timeAgo / 1440)}d ago`}
                        </span>
                      </td>
                      <td className="py-2.5 pr-0 pl-4">
                        <span className="font-bold font-konstruktor text-[#000000]">
                          {`0x${flip.user.Address.bits.substring(
                            0,
                            3
                          )}...${flip.user.Address.bits.substring(63)}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-0 pr-8 text-center">
                        <img
                          src={flip.side_chosen ? goldCoin : silverCoin}
                          alt={flip.side_chosen ? "Gold" : "Silver"}
                          className="w-8 h-8 inline-block"
                        />
                      </td>
                      <td className="py-2.5 px-2 md:px-4">
                        <span className="font-bold font-konstruktor text-[#000000]">
                          {amount} FUEL
                        </span>
                      </td>
                      <td className="py-2.5 px-2 md:px-4 text-center">
                        <span
                          className={`font-bold font-konstruktor ${flip.outcome.eqn(1) ? "text-[#00FF00]" : "text-[#000000]"
                            }`}
                        >
                          {flip.outcome.eqn(1) ? "WIN" : flip.outcome.eqn(2) ? "LOSS" : "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
