require("dotenv").config();
// const HDWalletProvider = require("@truffle/hdwallet-provider");
const ProviderEngine = require("web3-provider-engine");
const WebsocketSubprovider = require("web3-provider-engine/subproviders/websocket.js")
const { TruffleArtifactAdapter } = require("@0x/sol-trace");
const { ProfilerSubprovider } = require("@0x/sol-profiler");
const { CoverageSubprovider } = require("@0x/sol-coverage");
const { RevertTraceSubprovider } = require("@0x/sol-trace");

const mode = process.env.MODE || 'trace';
const port = process.env.PORT || 8545

const projectRoot = ".";
const solcVersion = "0.5.13";
const defaultFromAddress = process.env.ACCOUNT_TEST;
const isVerbose = true;
const artifactAdapter = new TruffleArtifactAdapter(projectRoot, solcVersion);
const provider = new ProviderEngine();

if (mode === "profile") {
  global.profilerSubprovider = new ProfilerSubprovider(
    artifactAdapter,
    defaultFromAddress,
    isVerbose
  );
  global.profilerSubprovider.stop();
  provider.addProvider(global.profilerSubprovider);
  provider.addProvider(new WebsocketSubprovider({ rpcUrl: `http://localhost:${port}` }));
} else {
  if (mode === "coverage") {
    global.coverageSubprovider = new CoverageSubprovider(
      artifactAdapter,
      defaultFromAddress,
      {
        isVerbose,
      }
    );
    provider.addProvider(global.coverageSubprovider);
  } else if (mode === "trace") {
    const revertTraceSubprovider = new RevertTraceSubprovider(
      artifactAdapter,
      defaultFromAddress,
      isVerbose
    );
    provider.addProvider(revertTraceSubprovider);
  }
  
  provider.addProvider(new WebsocketSubprovider({ rpcUrl: `http://localhost:${port}` }))
}
provider.start(err => {
  if (err !== undefined) {
    console.log(err);
    process.exit(1);
  }
});
/**
 * HACK: Truffle providers should have `send` function, while `ProviderEngine` creates providers with `sendAsync`,
 * but it can be easily fixed by assigning `sendAsync` to `send`.
 */
provider.send = provider.sendAsync.bind(provider);
// let truffle know what chain to migrate your contracts to

module.exports = {
  networks: {
    development: { // TODO: maybe change to development ?
      // skipDryRun: true,
      // host: "127.0.0.1",
      // port: port,
      network_id: "*",
      // provider: () => new HDWalletProvider(
      //   process.env.PRIV_KEY_DEPLOY,
      //   "http://127.0.0.1:8545",
      // ),
      provider
    },
  },
};
