require("dotenv").config();
jest.setTimeout(100000);

const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");

const DyDxFlashLoan = require("../build/contracts/DyDxFlashLoan.json");

const fromWei = (x, u = 18) => ethers.utils.formatUnits(x, u);

describe("initial conditions", () => {
  let wallet,
    daiTokenContractAsWalletWithDai,
    daiTokenContractAsMain,
    dydxFlashLoan,
    walletWithDai;

  beforeAll(async () => {
    wallet = global.wallet;
    walletWithDai = global.walletWithDai;
    daiTokenContractAsMain = new ethers.Contract(
      erc20.dai.address,
      erc20.dai.abi,
      wallet
    );
    daiTokenContractAsWalletWithDai = new ethers.Contract(
      erc20.dai.address,
      erc20.dai.abi,
      walletWithDai
    );

    dydxFlashLoan = new ethers.Contract(
      DyDxFlashLoan.networks["1"].address,
      DyDxFlashLoan.abi,
      wallet
    );
  });

  test("DyDx Contract should not have DAI", async () => {
    const daiInContractBalance = await daiTokenContractAsMain.balanceOf(
      dydxFlashLoan.address
    );

    const daiInContractParsed = parseFloat(fromWei(daiInContractBalance));
    expect(daiInContractParsed).toBeCloseTo(0);
  });
});
