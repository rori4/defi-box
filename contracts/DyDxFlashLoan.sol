pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "@studydefi/money-legos/dydx/contracts/DydxFlashloanBase.sol";
import "@studydefi/money-legos/dydx/contracts/ICallee.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./UniswapLiteBase.sol";

contract DyDxFlashLoan is ICallee, DydxFlashloanBase, UniswapLiteBase  {
    struct MyCustomData {
        address token;
        uint256 repayAmount;
        uint256 amount;
    }
    address constant daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant batAddress = 0x0D8775F648430679A709E98d2b0Cb6250d2887EF;

    function _uniswapTokenForToken(address from, address to, uint256 tokenAmount) internal returns (uint256 tokensBought) {
        uint256 amount = _tokenToToken(from, to, tokenAmount);
        return amount;
    }

    // This is the function that will be called postLoan
    // i.e. Encode the logic to handle your flashloaned funds here
    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public {
        MyCustomData memory mcd = abi.decode(data, (MyCustomData));
        uint256 balOfLoanedToken = IERC20(mcd.token).balanceOf(address(this));
        uint256 boutghtAmount = _uniswapTokenForToken(daiAddress, batAddress, mcd.amount);
        uint256 returned = _uniswapTokenForToken(batAddress, daiAddress, boutghtAmount);
        // Note that you can ignore the line below
        // if your dydx account (this contract in this case)
        // has deposited at least ~2 Wei of assets into the account
        // to balance out the collaterization ratio
        require(
            balOfLoanedToken >= mcd.repayAmount,
            "Not enough funds to repay dydx loan!"
        );

        // Loaned token should be 100,000 + 2 wei in contract
        if(balOfLoanedToken == 100000000000000000000002) {
            revert("Flash loan of 100,000 successful!");
        }
    }

    function initiateFlashLoan(address _solo, address _token, uint256 _amount)
        external
    {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, _token);

        // Calculate repay amount (_amount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _getRepaymentAmountInternal(_amount);
        IERC20(_token).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount);
        operations[1] = _getCallAction(
            // Encode MyCustomData for callFunction
            abi.encode(MyCustomData({token: _token, repayAmount: repayAmount, amount: _amount}))
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }
}
