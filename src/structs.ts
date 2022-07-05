import { ParamType } from "ethers/lib/utils";

const SubmissionAutoParamsTo = ParamType.from({
    type: "tuple",
    name: "SubmissionAutoParamsTo",
    components: [
        { name: "executionFee", type: 'uint256' },
        { name: "flags", type: 'uint256' },
        { name: "fallbackAddress", type:'bytes' },
        { name: "data", type:'bytes' },
    ]
});

const SubmissionAutoParamsFrom = ParamType.from({
    type: "tuple",
        name: "SubmissionAutoParamsFrom",
    components: [
    { name: "executionFee", type: 'uint256' },
    { name: "flags", type: 'uint256' },
    { name: "fallbackAddress", type:'address' },
    { name: "data", type:'bytes' },
    { name: "nativeSender", type:'bytes' },
]});

export const DeBridgeGate = {
    SubmissionAutoParamsFrom,
    SubmissionAutoParamsTo
}