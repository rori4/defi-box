require("dotenv").config();
jest.setTimeout(100000);

const { ethers, utils } = require("ethers");
const { parseUnits } = utils;
const { legos } = require("@studydefi/money-legos");
const uniswap = require("@studydefi/money-legos/uniswap");
const erc20 = require("@studydefi/money-legos/erc20");

const DyDxFlashLoan = require("../build/contracts/DyDxFlashLoan.json");

const fromWei = (x, u = 18) => ethers.utils.formatUnits(x, u);

describe("initial conditions", () => {
  let wallet,
    daitTokenContract,
    dydxFlashLoan,
    walletWithDai,
    uniswapFactory;

  beforeAll(async () => {
    wallet = global.wallet;
    daitTokenContract = new ethers.Contract(
      erc20.dai.address,
      erc20.dai.abi,
      wallet
    );

    dydxFlashLoan = new ethers.Contract(
      DyDxFlashLoan.networks["1"].address,
      DyDxFlashLoan.abi,
      wallet
    );

    uniswapFactory = new ethers.Contract(
      uniswap.factory.address,
      uniswap.factory.abi,
      wallet,
    );
  });

  test("DyDx Contract should not have DAI", async () => {
    const daiInContractBalance = await daitTokenContract.balanceOf(
      dydxFlashLoan.address
    );

    const daiInContractParsed = parseFloat(fromWei(daiInContractBalance));
    expect(daiInContractParsed).toBeCloseTo(0);
  });

  test("buy DAI from Uniswap manually", async () => {
    const buyAmount = 10
    const daiExchangeAddress = await uniswapFactory.getExchange(
      erc20.dai.address,
    );

    const daiExchange = new ethers.Contract(
      daiExchangeAddress,
      uniswap.exchange.abi,
      wallet,
    );

    // collect info on state before the swap
    const ethBefore = await wallet.getBalance();
    const daiBefore = await daitTokenContract.balanceOf(wallet.address);
    const expectedDai = await daiExchange.getEthToTokenInputPrice(
      ethers.utils.parseEther(buyAmount.toString()),
    );

    // do the actual swapping
    await daiExchange.ethToTokenSwapInput(
      1, // min amount of token retrieved
      2525644800, // random timestamp in the future (year 2050)
      {
        gasLimit: 4000000,
        value: ethers.utils.parseEther(buyAmount.toString()),
      },
    );

    // collect info on state after the swap
    const ethAfter = await wallet.getBalance();
    const daiAfter = await daitTokenContract.balanceOf(wallet.address);
    const ethLost = parseFloat(fromWei(ethBefore.sub(ethAfter)));

    expect(fromWei(daiBefore)).toBe("0.0");
    expect(fromWei(daiAfter)).toBe(fromWei(expectedDai));
    expect(ethLost).toBeCloseTo(buyAmount);
  });

  test("Initiate flash loan 100,000", async () => {
    try {
      const tokenAmount = parseUnits("2", "wei"); // must be exactly 2 wei
      await daitTokenContract.transfer(
        dydxFlashLoan.address,
        tokenAmount
      );
      const tx = await dydxFlashLoan.initiateFlashLoan(
        legos.dydx.soloMargin.address,
        legos.erc20.dai.address,
        parseUnits("100000", "ether")
      );
    } catch (error) {
      if(error.hashes){
        const errorHash = error.hashes[0];
        const reason = error.results[errorHash].reason;
        console.log(reason)
        expect(reason).toBe("Flash loan of 100,000 successful!");
      } else {
        console.log(error)
      }
    }
  });

  test("Initiate flash loan 200,000", async () => {
    try {
      const tokenAmount = parseUnits("20", "ether"); // must be exactly 2 wei
      await daitTokenContract.transfer(
        dydxFlashLoan.address,
        tokenAmount
      );
      const tx = await dydxFlashLoan.initiateFlashLoan(
        legos.dydx.soloMargin.address,
        legos.erc20.dai.address,
        parseUnits("200000", "ether"),
        {
          gasLimit: 6000000,
        }
      );
      await tx.wait();
    } catch (error) {
        console.log(error)
    }
  });
});
