import { useEffect, useState } from "react";
import { Wallet, LogOut } from "lucide-react";
import {
  useConnectUI,
  useDisconnect,
  useWallet,
} from "@fuels/react";
import { motion } from "framer-motion";

function WalletConnect() {
  const [address, setAddress] = useState("");
  const { connect, isConnecting, isConnected } = useConnectUI();
  const { wallet } = useWallet();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (wallet) {
      setAddress(wallet.address.toB256());
    }
  }, [wallet]);

  return (
    <>
      {!isConnected ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => connect()}
          className="relative px-5 py-2.5 bg-black border-2 border-[#FFCC57] font-konstruktor"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))",
          }}
        >
          <div className="relative flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[#FFCC57]">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </span>
          </div>
        </motion.button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-black border-2 border-[#FFCC57] font-konstruktor">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[#FFCC57] mt-1">
                {address.substring(0, 6)}...{address.substring(address.length - 4)}
              </span>
            </div>
          </div>
          <button
            onClick={() => disconnect()}
            className="p-2 bg-black border-2 border-[#FFCC57] text-[#FFCC57] hover:bg-black/80 transition-colors"
            title="Disconnect wallet"
          >
            <LogOut size={24} />
          </button>
        </div>
      )}
    </>
  );
}

export default WalletConnect;
