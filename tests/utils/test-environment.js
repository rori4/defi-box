require("dotenv").config();

const { ethers } = require("ethers");
const Ganache = require("ganache-core");
const NodeEnvironment = require("jest-environment-node");
const WALLET_WITH_DAI = "0x07BB41Df8C1d275c4259CdD0dBf0189d6a9a5F32"

const startChain = async () => {
  const ganache = Ganache.provider({
    fork: "http://127.0.0.1:8545",
    network_id: 1,
    unlocked_accounts: [WALLET_WITH_DAI], // DAI holder account
    accounts: [
      {
        secretKey: process.env.PRIV_KEY_TEST,
        balance: ethers.utils.hexlify(ethers.utils.parseEther("1000")),
      },
    ],
  });

  const provider = new ethers.providers.Web3Provider(ganache);
  const wallet = new ethers.Wallet(process.env.PRIV_KEY_TEST, provider);
  const walletWithDai = provider.getSigner(WALLET_WITH_DAI);
  return { wallet, walletWithDai };
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
