import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { FuelProvider } from "@fuels/react";
import { defaultConnectors } from "@fuels/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
// import { Provider } from "fuels";
import { CHAIN_IDS } from "fuels";

const queryClient = new QueryClient();
// const fuelProvider = Provider.create("https://testnet.fuel.network/v1/graphql");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FuelProvider
        theme="dark"
        networks={[
          {
            chainId: CHAIN_IDS.fuel.mainnet,
            url: "https://mainnet.fuel.network/v1/graphql",
          },
        ]}
        fuelConfig={{
          connectors: defaultConnectors(),
        }}
      >
        <App />
        <Toaster
          position={window.innerWidth <= 768 ? "top-center" : "bottom-right"}
          toastOptions={{
            success: {
              style: {
                background: "rgba(10, 25, 48, 0.95)",
                color: "#00F0FF",
                border: "1px solid rgba(0, 240, 255, 0.2)",
                backdropFilter: "blur(8px)",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "500",
              },
              iconTheme: {
                primary: "#00F0FF",
                secondary: "rgba(10, 25, 48, 0.95)",
              },
              duration: 4000,
            },
            error: {
              style: {
                background: "rgba(10, 25, 48, 0.95)",
                color: "#FF4B4B",
                border: "1px solid rgba(255, 75, 75, 0.2)",
                backdropFilter: "blur(8px)",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "500",
              },
              iconTheme: {
                primary: "#FF4B4B",
                secondary: "rgba(10, 25, 48, 0.95)",
              },
              duration: 4000,
            },
            loading: {
              style: {
                background: "rgba(10, 25, 48, 0.95)",
                color: "#FFD700",
                border: "1px solid rgba(255, 215, 0, 0.2)",
                backdropFilter: "blur(8px)",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "500",
              },
              duration: 4000,
            },
            custom: {
              style: {
                background: "rgba(10, 25, 48, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(8px)",
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "500",
              },
            },
          }}
        />
      </FuelProvider>
    </QueryClientProvider>
  </StrictMode>
);
