const {createKeys} = require('../../src/clientManager');
const sharedTests = require('../shared/tests');
const PollUntil = require('poll-until-promise');
const {last} = require('lodash/fp');
const daemonConstants = require('../../resources/daemonConstants');
const {stopSwarmsAndRemoveStateHook, localSetup} = require('../shared/hooks');

const numOfNodes = harnessConfigs.numOfNodes;

describe('dynamic peering', function () {

    const dynamicPeerTests = [{
        numOfKeys: 0
    }, {
        numOfKeys: 50
    }, {
        numOfKeys: 100
    }, {
        numOfKeys: 500
    }];

    Object.defineProperties(dynamicPeerTests, {
        name: {value: obj => `add peer with ${obj.numOfKeys} keys loaded in db`},
        hookTimeout: {value: obj => obj.numOfKeys * harnessConfigs.keyCreationTimeoutMultiplier}
    });

    dynamicPeerTests.forEach((ctx) => {

        context(dynamicPeerTests.name(ctx), function () {

            before('stand up swarm and client', async function () {
                this.timeout(dynamicPeerTests.hookTimeout(ctx) > harnessConfigs.defaultBeforeHookTimeout ? dynamicPeerTests.hookTimeout(ctx) : harnessConfigs.defaultBeforeHookTimeout);

                const {manager: _manager, swarm: _swarm, api: _api} = await localSetup({numOfNodes, createDB: true});
                this.swarmManager = _manager;
                this.swarm = _swarm;
                this.api = _api;

                if (ctx.numOfKeys > 0) {
                    await createKeys({api: this.api}, ctx.numOfKeys)
                }

                await this.swarm.addDaemon();
                await this.swarm.startUnstarted();
            });

            stopSwarmsAndRemoveStateHook({afterHook: after, preserveSwarmState: false});

            it('should successfully join swarm', async function () {

                await new Promise(res => {

                    last(this.swarm.getDaemons()).getProcess().stdout.on('data', buf => {
                        const out = buf.toString();

                        if (out.includes(daemonConstants.newPeerJoinsMembership)) {
                            res();
                        }
                    });
                });
            });

            it('should increment swarm view number by 1', async function () {
                this.timeout(60000);

                const pollView = new PollUntil();

                await pollView
                    .stopAfter(60000)
                    .tryEvery(2000)
                    .execute(() => new Promise((res, rej) => {

                        this.api.status().then(val => {

                            const response = JSON.parse(val.moduleStatusJson).module[0].status;

                            if (response.view === 2) {
                                return res(true)
                            } else {
                                rej(false)
                            }
                        });
                    }))

            });

            it('should be included in status response', async function () {

                const res = await this.api.status();

                const parsedStatusJson = JSON.parse(res.moduleStatusJson).module[0].status;

                parsedStatusJson.peer_index.should.contain.an.item.with.property('uuid', last(this.swarm.getDaemons()).publicKey)
            });

            if (ctx.numOfKeys > 0) {

                it('should be able to fetch full keys list', async function () {
                    this.timeout(10000);
                    expect((await this.api.keys()).length).to.be.equal(ctx.numOfKeys);
                });

                it('should be able to read last key before pre-primary failure', async function () {
                    expect(await this.api.read(`batch${ctx.numOfKeys - 1}`)).to.be.equal('value')
                })
            }

            sharedTests.crudFunctionality.apply(this);

            sharedTests.miscFunctionality.apply(this);
        });
    });
});
