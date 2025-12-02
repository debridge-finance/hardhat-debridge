// tslint:disable-next-line no-implicit-dependencies
import {
  DummySignatureStorage,
  Flag,
  Flags,
  SendAutoParams,
  Submission,
} from "@debridge-finance/desdk/lib/evm";
import { assert, expect } from "chai";
import { BigNumber, ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { deployContracts, useEnvironment } from "./helpers";

describe("Integration tests examples", function () {
  useEnvironment("hardhat-debridge-test-env");
  describe("Hardhat Runtime Environment extension", function () {
    it("Should add the example field", async function () {
      assert.isObject(this.hre.deBridge);
    });
  });
});

describe("Check emulator functions", function () {
  useEnvironment("hardhat-debridge-test-env");

  describe("Smoke test", function () {
    it("Should transfer", async function () {
      const gate = await this.hre.deBridge.emulator.deployGate();
      const fee = await gate.globalFixedNativeFee();
      const transferAmount = parseEther("1");

      const [, receiver] = await this.hre.ethers.getSigners();
      const receiverAmountBefore = await receiver.getBalance();
      const expectedAmount = receiverAmountBefore.add(
        transferAmount.mul(10000 - 10).div(10000)
      );

      const txSend = await gate.send(
        ethers.constants.AddressZero,
        transferAmount,
        this.hre.ethers.provider.network.chainId,
        receiver.address,
        "0x",
        true,
        0,
        new SendAutoParams({
          executionFee: "0",
          fallbackAddress: receiver.address,
          flags: new Flags(Flag.UNWRAP_ETH), // expect to receive native ether
          data: "0x",
        }).encode(),
        { value: transferAmount.add(fee) }
      );
      await txSend.wait();

      const submissionIds = await this.hre.deBridge.emulator.autoClaim();
      expect(submissionIds.length).to.be.eq(1);

      const receiverAmountAfter = await receiver.getBalance();
      expect(receiverAmountAfter.eq(expectedAmount)).to.equal(true);
    });

    it("Should reveal actual EVM call stack using the buildinfo when error occurred inside the deBridgeGate contact", async function () {
      const gate = await this.hre.deBridge.emulator.deployGate();
      const [, receiver] = await this.hre.ethers.getSigners();

      const txPromise = gate.send(
        ethers.constants.AddressZero,
        parseEther("1"),
        this.hre.ethers.provider.network.chainId,
        receiver.address,
        "0x",
        true,
        0,
        new SendAutoParams({
          executionFee: "0",
          fallbackAddress: receiver.address,
          flags: new Flags(),
          data: "0x",
        }).encode(),
        { value: "0", gasLimit: 8_000_000 }
      );

      await expect(txPromise).to.be.revertedWithCustomError(
        gate,
        "TransferAmountNotCoverFees"
      );

      try {
        await txPromise;
        expect(true).to.eq(false, "Should not happen");
      } catch (e) {
        expect(e.stackTrace.length).gt(0);
        const lastCall = e.stackTrace[e.stackTrace.length - 1].sourceReference;
        expect(lastCall).is.not.eq(undefined, "Call stack is not unrolled");
        expect(lastCall.function).to.eq("_send");
        expect(lastCall.contract).to.eq("DeBridgeGate");
        expect(lastCall.sourceName).to.match(
          new RegExp(
            "https://github.com/debridge-finance/debridge-contracts-v1/blob/[a-z0-9.]+/contracts/transfers/DeBridgeGate.sol"
          )
        );
      }
    });
  });

  describe("Checking autoClaim", function () {
    const INCREMENT_BY = 10;

    describe("Checking autoClaim for single submission", function () {
      before(async function () {
        this.contracts = await deployContracts(this.hre);
        this.evmContext = {
          provider: this.hre,
          deBridgeGateAddress: this.contracts.gate.address,
          signatureStorage: new DummySignatureStorage(),
        };
      });

      before(async function () {
        const tx = await this.contracts.incrementor.increment(INCREMENT_BY, {
          value: this.contracts.gateProtocolFee,
        });
        this.tx = await tx.wait();
      });

      it("Must capture one submission", async function () {
        const submissions = await Submission.findAll(
          this.tx.transactionHash,
          this.evmContext
        );

        expect(1).to.be.eq(submissions.length);
      });

      it("Must claim", async function () {
        const submissionIds = await this.hre.deBridge.emulator.autoClaim();

        expect(1).to.be.eq(submissionIds.length);

        const currentValue = await this.contracts.counter.counter();
        expect(currentValue.eq(INCREMENT_BY)).to.be.eq(true);
      });
    });

    describe("Checking autoClaim for multiple submissions", function () {
      before(async function () {
        this.contracts = await deployContracts(this.hre);
        this.evmContext = {
          provider: this.hre,
          deBridgeGateAddress: this.contracts.gate.address,
          signatureStorage: new DummySignatureStorage(),
        };
      });

      before(async function () {
        const tx = await this.contracts.incrementor.incrementMulti(
          [INCREMENT_BY, INCREMENT_BY * 2, INCREMENT_BY * 3],
          {
            value: this.contracts.gateProtocolFee.mul(3),
          }
        );
        this.tx = await tx.wait();
      });

      it("Must capture multiple submissions", async function () {
        const submissions = await Submission.findAll(
          this.tx.transactionHash,
          this.evmContext
        );

        expect(3).to.be.eq(submissions.length);
      });

      it("Must claim all submissions", async function () {
        const submissionIds = await this.hre.deBridge.emulator.autoClaim();

        expect(3).to.be.eq(submissionIds.length);

        const currentValue = await this.contracts.counter.counter();
        const expectedValue =
          INCREMENT_BY + INCREMENT_BY * 2 + INCREMENT_BY * 3;
        expect(currentValue.eq(expectedValue)).to.be.eq(true);
      });
    });

    describe("Checking autoClaim for multiple submissions (partially claimed)", function () {
      before(async function () {
        this.contracts = await deployContracts(this.hre);
        this.evmContext = {
          provider: this.hre,
          deBridgeGateAddress: this.contracts.gate.address,
          signatureStorage: new DummySignatureStorage(),
        };
      });

      before(async function () {
        const tx = await this.contracts.incrementor.incrementMulti(
          [INCREMENT_BY, INCREMENT_BY * 2, INCREMENT_BY * 3],
          {
            value: this.contracts.gateProtocolFee.mul(3),
          }
        );
        this.tx = await tx.wait();
      });

      it("Must capture multiple submissions", async function () {
        const submissions = await Submission.findAll(
          this.tx.transactionHash,
          this.evmContext
        );

        expect(3).to.be.eq(submissions.length);

        // claim second submission explicitly
        const claim = await submissions[1].toEVMClaim(this.evmContext);
        const args = await claim.getEncodedArgs();
        await this.contracts.gate.claim(...args);
      });

      it("Must claim submissions #0 and #2", async function () {
        const submissionIds = await this.hre.deBridge.emulator.autoClaim();

        expect(2).to.be.eq(submissionIds.length);
        const currentValue = await this.contracts.counter.counter();
        const expectedValue =
          INCREMENT_BY + INCREMENT_BY * 2 + INCREMENT_BY * 3;
        expect(currentValue.eq(expectedValue)).to.be.eq(true);
      });
    });

    describe("Checking autoClaim for multiple txns", function () {
      before(async function () {
        this.contracts = await deployContracts(this.hre);
        this.evmContext = {
          provider: this.hre,
          deBridgeGateAddress: this.contracts.gate.address,
          signatureStorage: new DummySignatureStorage(),
        };
      });

      before(async function () {
        const tx = await this.contracts.incrementor.increment(INCREMENT_BY, {
          value: this.contracts.gateProtocolFee,
        });
        this.tx = await tx.wait();

        const tx2 = await this.contracts.incrementor.increment(
          INCREMENT_BY * 2,
          {
            value: this.contracts.gateProtocolFee,
          }
        );
        await tx2.wait();
      });

      it("Must claim all submissions", async function () {
        const submissionIds = await this.hre.deBridge.emulator.autoClaim();

        expect(2).to.be.eq(submissionIds.length);
        const currentValue = await this.contracts.counter.counter();
        const expectedValue = INCREMENT_BY + INCREMENT_BY * 2;
        expect(currentValue.eq(expectedValue)).to.be.eq(true);
      });
    });

    describe("Checking autoClaim for multiple txns (partially claimed)", function () {
      before(async function () {
        this.contracts = await deployContracts(this.hre);
        this.evmContext = {
          provider: this.hre,
          deBridgeGateAddress: this.contracts.gate.address,
          signatureStorage: new DummySignatureStorage(),
        };
      });

      before(async function () {
        const tx = await this.contracts.incrementor.increment(INCREMENT_BY, {
          value: this.contracts.gateProtocolFee,
        });
        this.tx = await tx.wait();
      });

      before(async function () {
        const tx2 = await this.contracts.incrementor.increment(
          INCREMENT_BY * 2,
          {
            value: this.contracts.gateProtocolFee,
          }
        );
        const tx2Receipt = await tx2.wait();
        const submissions = await Submission.findAll(
          tx2Receipt.transactionHash,
          this.evmContext
        );

        expect(1).to.be.eq(submissions.length);

        const claim = await submissions[0].toEVMClaim(this.evmContext);
        const args = await claim.getEncodedArgs();
        await this.contracts.gate.claim(...args);
      });

      it("Must claim all submissions", async function () {
        const submissionIds = await this.hre.deBridge.emulator.autoClaim();

        expect(1).to.be.eq(submissionIds.length);
        const currentValue = await this.contracts.counter.counter();
        const expectedValue = INCREMENT_BY + INCREMENT_BY * 2;
        expect(currentValue.eq(expectedValue)).to.be.eq(true);
      });
    });
  });
});
