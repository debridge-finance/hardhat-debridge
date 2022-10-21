//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.7;

import "@debridge-finance/contracts/contracts/interfaces/ISignatureVerifier.sol";

contract MockSignatureVerifier is ISignatureVerifier {
    function submit(
        bytes32 /*_submissionId*/,
        bytes memory /*_signatures*/,
        uint8 /*_excessConfirmations*/
    ) external override {/*_*/}
}
