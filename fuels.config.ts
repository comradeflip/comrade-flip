import { createConfig } from "fuels";

// If your node is running on a port other than 4000, you can set it here
const fuelCorePort = +(process.env.VITE_FUEL_NODE_PORT as string) || 4000;
export const testnetProviderUrl = "https://testnet.fuel.network/v1/graphql";

export default createConfig({
  workspace: "./fuelflipvrf", // Path to your Sway workspace
  output: "./src/sway-api", // Where your generated types will be saved
  fuelCorePort,
  providerUrl: testnetProviderUrl,
});
// import { createConfig } from "fuels";

// export default createConfig({
//   contracts: ["./fuelflip-contract/contract", "./fuelflip-contract/vrf"],
//   output: "./src/sway-api",
// });
