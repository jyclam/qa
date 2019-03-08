/*
* Class used to manage generated daemons' information and state.
* */

const {execSync} = require('child_process');

module.exports = class SwarmState {

    constructor (configsObject) {
        this._liveNodes = [];
        this.load(configsObject);
    }

    get nodes() {
        // returns an array of arrays of [daemon#, pubKey] pairs, sorted lexicographically by pubKey
        return this._nodes
    }

    set liveNodes(arr) {
        this._liveNodes = arr
    }

    get liveNodes() {
        return this._liveNodes
    }

    pushLiveNodes(node) {
        this._liveNodes.push(node)
    }

    set primary(node) {
        this._primary = node
    }

    get primary() {
        return this._primary
    }

    get backups() {
        if (this._primary) {
            return this._liveNodes.filter((node) => node !== this._primary)
        } else {
            return new Error('No primary set')
        }
    }

    get lastNode() {
        return this._nodes[this._nodes.length - 1]
    }

    killNode(idx) {
        execSync(`kill $(ps aux | grep '[b]luzelle${idx}'| awk '{print $2}')`);
        this.declareDeadNode(`daemon${idx}`)
    }

    declareDeadNode(daemon) {
        if (nodeExistsInLiveNodes.call(this, daemon)) {
            this._liveNodes.splice(this._liveNodes.indexOf(daemon),1);
        }

        if (this.primary === daemon) {
            this.primary === null;
        }

        if (this[daemon].stream){
            this[daemon].stream = null
        }
    }

    addMultipleFailureListeners (array) {
        array.forEach(([msg, times]) => {
            this.addFailureListener(msg, times)
        })
    }

    addFailureListener (msg, times) {
        const daemonObjects = Object.entries(this).filter(prop => prop[0].includes('daemon'));

        daemonObjects.forEach(([key, value]) => {

            let count = 0;
            if (value.stream !== null)  {

                value.stream.stdout.on('data', (buffer) => {

                    let data = buffer.toString();

                    if (data.includes(msg)) {

                        if (++count >= times) {
                            throw new Error(`"${msg}" was logged >= ${times} times in ${key}. \n ${data}`);
                        }
                    };
                });
            }
        });
    };


    load(configsObject) {

        const _temp = [];

        configsObject.forEach(data => {

            this[`daemon${data.index}`] =
                {
                    uuid: data.uuid,
                    port: data.content.listener_port,
                    http_port: data.content.http_port,
                    index: data.index
                };

            _temp.push([ data.uuid, `daemon${data.index}`]);
        });

        this._nodes = _temp.sort();
    }
};

function nodeExistsInLiveNodes (daemon) {
    return this._liveNodes.indexOf(daemon) >= 0;
}
