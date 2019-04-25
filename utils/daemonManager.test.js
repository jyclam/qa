const {generateSwarm} = require('./daemonManager');
const {random, last} = require('lodash/fp');

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-things'));
chai.should();


describe('daemonManager', function () {

    const numberOfDaemons = 3;

    beforeEach('generateSwarm', function () {
        this.swarm = generateSwarm({numberOfDaemons});
    });

    afterEach('stop swarm', function () {
        this.swarm.stop();
    });

    it('swarm should have correct number of daemons', function () {
        this.swarm.getDaemons().should.have.lengthOf(numberOfDaemons)
    });

    it('should be able to query daemon running status', function () {
        this.swarm.getDaemons().map(daemon => daemon.isRunning()).should.all.be.equal(false)
    });

    it('should be able to start daemons', async function () {
        await this.swarm.start();

        this.swarm.getDaemons().map(daemon => daemon.isRunning()).should.all.be.equal(true)
    });

    it('should be able to stop all daemons', async function () {
        await this.swarm.start();
        await this.swarm.stop();

        this.swarm.getDaemons().map(daemon => daemon.isRunning()).should.all.be.equal(false);
    });

    it('should be able to start a select number of daemons', async function () {
        await this.swarm.startPartial(2);

        this.swarm.getDaemons().map(daemon => daemon.isRunning()).should.deep.equal([true, true, false]);
    });

    it('should be able to start unstarted daemons', async function () {
        await this.swarm.startPartial(1);
        await this.swarm.startUnstarted();

        this.swarm.getDaemons().map(daemon => daemon.isRunning()).should.all.be.equal(true);
    });

    it('should be able to add daemon to unstarted swarm', function () {
        this.swarm.addDaemon();

        this.swarm.getDaemons().should.have.lengthOf(numberOfDaemons + 1);
    });

    it('should be able to add daemon to started swarm', async function () {
        await this.swarm.start();
        this.swarm.addDaemon();

        this.swarm.getDaemons().should.have.lengthOf(numberOfDaemons + 1);
    });

    it('unstarted new daemon should have correct isRunning status', async function () {
        await this.swarm.start();
        this.swarm.addDaemon();

        last(this.swarm.getDaemons()).isRunning().should.equal(false);
    });

    it('starting new daemon should change isRunning status', async function () {
        await this.swarm.start();
        this.swarm.addDaemon();
        await this.swarm.startUnstarted();

        last(this.swarm.getDaemons()).isRunning().should.equal(true);
    });

    it('should be able to stop daemons selectively', async function () {
        await this.swarm.start();
        const randomDaemon = random(numberOfDaemons - 1, 0);
        await this.swarm.getDaemons()[randomDaemon].stop();

        this.swarm.getDaemons()[randomDaemon].isRunning().should.equal(false);
    });

    it('should be able to restart daemons selectively', async function () {
        await this.swarm.start();
        const randomDaemon = random(numberOfDaemons - 1, 0);
        await this.swarm.getDaemons()[randomDaemon].restart()
    });

    it('should be able to read daemon stream', async function () {
        await this.swarm.start();

        this.swarm.getDaemons()[0].getProcess().stdout.on('data', (buf) => {
            const out = buf.toString();
            out.should.have.lengthOf.greaterThan(0);
        });
    });
});

