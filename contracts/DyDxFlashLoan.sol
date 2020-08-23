pragma solidity ^0.5.13;
pragma experimental ABIEncoderV2;

import "@studydefi/money-legos/dydx/contracts/DydxFlashloanBase.sol";
import "@studydefi/money-legos/dydx/contracts/ICallee.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface OrFeedInterface {
  function getExchangeRate ( string calldata fromSymbol, string calldata  toSymbol, string calldata venue, uint256 amount ) external view returns ( uint256 );
  function getTokenDecimalCount ( address tokenAddress ) external view returns ( uint256 );
  function getTokenAddress ( string calldata  symbol ) external view returns ( address );
  function getSynthBytes32 ( string calldata  symbol ) external view returns ( bytes32 );
  function getForexAddress ( string calldata symbol ) external view returns ( address );
  function arb(address  fundsReturnToAddress,  address liquidityProviderContractAddress, string[] calldata   tokens,  uint256 amount, string[] calldata  exchanges) external payable returns (bool);
}

contract DyDxFlashLoan is ICallee, DydxFlashloanBase {
    struct MyCustomData {
        address token;
        uint256 repayAmount;
    }
    address constant orfeedAddress = 0x8316B082621CFedAB95bf4a44a1d4B64a6ffc336;
    // This is the function that will be called postLoan
    // i.e. Encode the logic to handle your flashloaned funds here
    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public {
        MyCustomData memory mcd = abi.decode(data, (MyCustomData));
        IERC20 token = IERC20(mcd.token);
        uint256 balOfLoanedToken = token.balanceOf(address(this));

        OrFeedInterface orfeed= OrFeedInterface(orfeedAddress);
        token.approve(orfeedAddress, 10000000000000000000000000000);
        
         string[] memory tokenOrder = new string[](3);
         string[] memory exchangeOrder = new string[](3);

         tokenOrder[0]= "WETH";
         tokenOrder[1]= "BAT";
         tokenOrder[2]= "DAI";

         exchangeOrder[0]= "KYBER";
         exchangeOrder[1]= "KYBER";
         exchangeOrder[2]= "KYBER";
         
         
        orfeed.arb(address(this), address(this), tokenOrder, mcd.repayAmount, exchangeOrder);

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
            abi.encode(MyCustomData({token: _token, repayAmount: repayAmount}))
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }
}
