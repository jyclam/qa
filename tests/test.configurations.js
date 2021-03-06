// load env variables from qa/.env if it exists
require('dotenv').config();

global.bluzelle = require('../bluzelle-js/lib/bluzelle-node').bluzelle;

global.chai = require('chai');
global.expect = chai.expect;
chai.use(require('chai-as-promised'));
chai.use(require('chai-json-schema'));
chai.use(require('chai-things'));
chai.should();

const harnessConfigs = global.harnessConfigs = {
    logLevel: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'crit',
    address: process.env.ADDRESS ? process.env.ADDRESS : 'localhost',
    port: process.env.PORT ? parseInt(process.env.PORT) : 50000,
    numOfNodes: process.env.NUM_OF_NODES ? parseInt(process.env.NUM_OF_NODES) : 4,
    testRemoteSwarm: process.env.TEST_REMOTE_SWARM ? process.env.TEST_REMOTE_SWARM : false,

    defaultUuid: process.env.DEFAULT_UUID ? process.env.DEFAULT_UUID : '96dd6297-d8ed-4bd1-a91e-ed2958cda3c7',
    masterPrivateKey: process.env.MASTER_PRIVATE_KEY ? process.env.MASTER_PRIVATE_KEY : 'MHcCAQEEIN1Bl1ZucJkJvkLeQXtnYeoERlrIF2OuNCo0mYi+G6tToAoGCCqGSM49AwEHoUQDQgAEWsFngpYif/xTFzASKJhdGF8QuGb2kyD+F/eVpJdWA3wQqMod/DzdCVrIl7PLJktS6UDTdh7o/h2eZYYXvI0p8w==',
    masterPublicKey: process.env.MASTER_PUBLIC_KEY ? process.env.MASTER_PUBLIC_KEY : 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWsFngpYif/xTFzASKJhdGF8QuGb2kyD+F/eVpJdWA3wQqMod/DzdCVrIl7PLJktS6UDTdh7o/h2eZYYXvI0p8w==',

    ethereumRpc: process.env.ETHEREUM_RPC ? process.env.ETHEREUM_RPC : 'http://127.0.0.1:8545',
    esrContractAddress: process.env.ESR_CONTRACT_ADDRESS ? process.env.ESR_CONTRACT_ADDRESS : '0x7FDbE549D8b47b8285ff106E060Eb9C43Fd879e5',
    maxSwarmStorage: process.env.MAX_SWARM_STORAGE ? process.env.MAX_SWARM_STORAGE : 200000,

    initialDaemonListenerPort: 50000,

    keyCreationTimeoutMultiplier: process.env.KEY_CREATION_TIMEOUT_MULTIPLIER ? process.env.KEY_CREATION_TIMEOUT_MULTIPLIER : 500, // time allotted per key created in before hooks of dynamically generated tests
    daemonStartTimeout: 5000,
};

Object.defineProperties(global.harnessConfigs, {
    viewChangeTimeout: {
        value: multiplyKeyCreationTimeoutBy.call(harnessConfigs, 300)
    },
    clientOperationTimeout: {
        value: multiplyKeyCreationTimeoutBy.call(harnessConfigs, 100)
    },
    defaultTestTimeout: {
        value: multiplyKeyCreationTimeoutBy.call(harnessConfigs, 50)
    },
    defaultBeforeHookTimeout: {
        value: multiplyKeyCreationTimeoutBy.call(harnessConfigs, 250)
    },
    defaultAfterHookTimeout: {
        value: multiplyKeyCreationTimeoutBy.call(harnessConfigs, 100)
    }
});

function multiplyKeyCreationTimeoutBy(multiplier) {
    return this.keyCreationTimeoutMultiplier * multiplier
};

console.log('***************************************************************************************************************************************************');
console.log(`Test configurations. ethereumRPC: ${harnessConfigs.ethereumRpc}, esrContractAddress: ${harnessConfigs.esrContractAddress}, testRemoteSwarm: ${harnessConfigs.testRemoteSwarm}`);
console.log('***************************************************************************************************************************************************\n');
