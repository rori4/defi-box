require("dotenv").config();
const { ethers } = require("ethers");
const path = require('path')
const NodeEnvironment = require("jest-environment-node");
const { RevertTraceSubprovider, TruffleArtifactAdapter } = require("@0x/sol-trace");
const { Web3ProviderEngine, GanacheSubprovider, FakeGasEstimateSubprovider } = require("@0x/subproviders");
const defaultFromAddress = process.env.ACCOUNT_TEST;
const projectRoot = process.cwd()
const solcVersion = require('../../truffle-config').compilers.solc.version
const artifactAdapter = new TruffleArtifactAdapter(projectRoot, solcVersion);
const revertTraceSubprovider = new RevertTraceSubprovider(artifactAdapter, defaultFromAddress, true);
const providerEngine = new Web3ProviderEngine();


const startChain = async () => {
  const ganache = new GanacheSubprovider({
    fork: "http://127.0.0.1:8545",
    network_id: 1,
    // unlocked_accounts: [WALLET_WITH_DAI], // DAI holder account
    accounts: [
      {
        secretKey: process.env.PRIV_KEY_TEST,
        balance: ethers.utils.hexlify(ethers.utils.parseEther("1000")),
      },
    ],
  });

  providerEngine.addProvider(new FakeGasEstimateSubprovider(4 * (10 ** 6))); // Ganache does a poor job of estimating gas, so just crank it up for testing.
  providerEngine.addProvider(revertTraceSubprovider);
  providerEngine.addProvider(ganache);
  providerEngine.start();
  
  const provider = new ethers.providers.Web3Provider(providerEngine);
  const wallet = new ethers.Wallet(process.env.PRIV_KEY_TEST, provider);
  
  return { wallet };
};

class CustomEnvironment extends NodeEnvironment {

  constructor(config, context) {
    super(config);
    this.testPath = context.testPath;
    this.docblockPragmas = context.docblockPragmas;
  }

  async setup() {
    await super.setup();

    const { wallet, walletWithDai } = await startChain();

    this.wallet = wallet;
    this.walletWithDai = walletWithDai;

    this.global.wallet = wallet;
    this.global.walletWithDai = walletWithDai
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = CustomEnvironment;
