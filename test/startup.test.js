const expect = require('chai').expect;
const waitUntil = require("async-wait-until");
const {exec, spawn} = require('child_process');
const {includes} = require('lodash');

const {logFileExists, logFileMoved, readFile} = require('../utils/daemon/logs');
const {startSwarm, killSwarm} = require('../utils/daemon/setup');
const {editConfigFile} = require('../utils/daemon/configs');

let logFileName;

describe('daemon startup', () => {

    describe('accepts time scaling env variable', () => {

        afterEach(() => killSwarm(logFileName));

        context('with valid value', () => {

            it('successfully changes time scale', async () => {
                await exec('cd ./scripts; ./run-daemon.sh bluzelle.json "env RAFT_TIMEOUT_SCALE=2"');

                await waitUntil(() => logFileName = logFileExists());

                await waitUntil(() => includes(readFile('output/', logFileName), 'RAFT_TIMEOUT_SCALE: 2'));
            });
        });

        context('without env variable', () => {

            it('time scale is unchanged at 1', async () => {
                await exec('cd ./scripts; ./run-daemon.sh bluzelle.json');

                await waitUntil(() => logFileName = logFileExists());

                await waitUntil(() => includes(readFile('output/', logFileName), 'RAFT_TIMEOUT_SCALE: 1'));
            });
        });

        context('with invalid value', () => {

            it('time scale is unchanged at 1', async () => {
                await exec('cd ./scripts; ./run-daemon.sh bluzelle.json "env RAFT_TIMEOUT_SCALE=asdf"');

                await waitUntil(() => logFileName = logFileExists());

                await waitUntil(() => includes(readFile('output/', logFileName), 'RAFT_TIMEOUT_SCALE: 1'));
            });
        });
    });

    describe('requires ethereum address', () => {

        afterEach(() => exec('kill -2 swarm'));

        context('with valid address', () => {

            context('with balance > 0', () => {

                it('successfully starts up', async () => {

                    await exec('cd ./scripts; ./run-daemon.sh bluzelle.json');

                    await waitUntil(() => logFileName = logFileExists());

                    await waitUntil(() => includes(readFile('output/', logFileName), 'Running node with ID:'));

                });
            });

            context('with balance <= 0', () => {

                beforeEach(() => editConfigFile('bluzelle3.json', 2, '\n  "ethereum" : "0x20B289a92d504d82B1502996b3E439072FC66489"'));

                it('fails to start up', done => {

                    exec('cd ./scripts; ./run-daemon.sh bluzelle3.json', async (error, stdout) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            return;
                        }

                        if (stdout.includes('No ETH balance found')) {
                            done();
                        }
                    });

                });
            })

        });

        context('with invalid address', () => {

            beforeEach(() => editConfigFile('bluzelle3.json', 2, '\n  "ethereum" : "asdf"'));

            it('fails to start up', done => {

                const node = spawn('./run-daemon.sh', ['bluzelle3.json'], {cwd: './scripts'});

                node.stderr.on('data', (data) => {
                    if (data.toString().includes('Invalid Ethereum address: asdf')) {
                        done();
                    }
                });

            });
        });
    });
});
