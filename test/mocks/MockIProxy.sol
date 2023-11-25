//SPDX-License-Identifier: MIT
pragma solidity >=0.8.11 <0.9.0;

import {IProxy} from "@api3/contracts/v0.8/interfaces/IProxy.sol";

contract MockIProxy is IProxy {
    int224 private price;
    uint32 private timestamp;
    address private api3Server = address(bytes20(bytes("API3_SERVER_V1"))); // constructor arg found here https://docs.api3.org/reference/dapis/chains/#frontmatter-title

    constructor(int224 _price) {
        timestamp = uint32(block.timestamp);
        price = _price;
    }

    function read() external view returns (int224, uint32) {
        return (price, timestamp);
    }

    function api3ServerV1() external view returns (address) {
        return api3Server;
    }
}
