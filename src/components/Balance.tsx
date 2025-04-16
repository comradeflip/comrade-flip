import { useEffect } from "react";
import { useBalance, useWallet } from "@fuels/react";
import { Coins } from "lucide-react";

const BASE_ASSET_ID =
  "0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07";
const FUEL_ASSET_ID =
  "0x1d5d97005e41cae2187a895fd8eab0506111e0e2f3331cd3912c15c24e3c1d82";

interface BalanceProps {
  compact?: boolean;
}

function Balance({ compact = false }: BalanceProps) {
  const { wallet } = useWallet();
  const { balance, refetch } = useBalance({
    address: wallet?.address.toB256(),
    assetId: FUEL_ASSET_ID,
  });
  const { balance: baseBalance, refetch: refetchBase } = useBalance({
    address: wallet?.address.toB256(),
    assetId: BASE_ASSET_ID,
  });

  useEffect(() => {
    // Set up polling interval
    const interval = setInterval(() => {
      refetch();
      refetchBase();
    }, 5000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [refetch, refetchBase]);

  const formattedBalance = balance
    ? (Number(balance.toString()) / 1e9).toPrecision(5)
    : "0.00";
  const formattedBaseBalance = baseBalance
    ? (Number(baseBalance.toString()) / 1e9).toPrecision(5)
    : "0.00";

  if (compact) {
    return <span className="font-bold uppercase text-[#FFCC57]">{formattedBalance} FUEL</span>;
  }

  return (
    <div 
      className="hidden md:flex items-center gap-2 px-3 py-2 pt-2.5 bg-black/90 border-2 border-[#FFCC57] font-konstruktor"
      style={{
        filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))",
      }}
    >
      <span 
        className="text-sm text-[#FFCC57]/70 uppercase tracking-wider"
        style={{
          WebkitTextStroke: "0.2px #000000",
        }}
      >
        Balance
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          <span 
            className="font-bold text-lg uppercase tracking-wider text-[#FFCC57]"
            style={{
              WebkitTextStroke: "0.5px #000000",
            }}
          >
            {formattedBalance}
          </span>
          <span 
            className="ml-1 text-sm text-[#FFCC57]/80 uppercase"
            style={{
              WebkitTextStroke: "0.2px #000000",
            }}
          >
            FUEL
          </span>
        </div>
        <div className="w-px h-4 bg-[#FFCC57]/20" />
        <div className="flex items-center">
          <span 
            className="font-bold text-lg uppercase tracking-wider text-[#FFCC57]"
            style={{
              WebkitTextStroke: "0.5px #000000",
            }}
          >
            {formattedBaseBalance}
          </span>
          <span 
            className="ml-1 text-sm text-[#FFCC57]/80 uppercase"
            style={{
              WebkitTextStroke: "0.2px #000000",
            }}
          >
            ETH
          </span>
        </div>
      </div>
    </div>
  );
}

export default Balance; 