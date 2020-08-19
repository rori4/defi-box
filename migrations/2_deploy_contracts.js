const MyDapp = artifacts.require("MyDapp");
const DyDxFlashLoan = artifacts.require("DyDxFlashLoan");

module.exports = function (deployer) {
  deployer.deploy(MyDapp);
  deployer.deploy(DyDxFlashLoan);
};
