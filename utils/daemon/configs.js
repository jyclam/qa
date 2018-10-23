const fs = require('fs');
const fsPromises = require('fs').promises;

const uuids = require('./uuids');

let swarm = {};

const configUtils = {
    editFile: ({filename, changes, remove, deleteKey}) => {
        changes = {...changes};

        if (deleteKey) {
            deleteKey = [...deleteKey];
        }

        let fileContent;

        try {
            fileContent = JSON.parse(fs.readFileSync(`./daemon-build/output/${filename}`, 'utf8'));
        } catch (e) {
            throw new Error('Read and parse as JSON failed.')
        }


        if (remove) {
            removeValues(fileContent, remove);
        } else if (deleteKey) {
            delKey(fileContent, deleteKey);
        } else {
            setValues(fileContent, changes);
        }

        try {
            fs.writeFileSync(`./daemon-build/output/${filename}`, JSON.stringify(fileContent), 'utf8');
        } catch (e) {
            throw new Error('Writing changes failed.')
        }

        return fileContent
    },

    generateConfigs: async (numOfConfigs) => {

        const template = readTemplate('./configs/template.json');

        let uuidsList = uuids.generate(numOfConfigs);

        let configsWithIndex = [...Array(numOfConfigs).keys()].map((internalIndex) => {

            let currentIndex = configCounter.increment();

            return {
                content: new Config(template,
                    {
                        listener_port: template.listener_port + currentIndex,
                        http_port: template.http_port + currentIndex,
                        uuid: uuidsList[internalIndex]
                    }),
                index: currentIndex
            }
        });

        await Promise.all(configsWithIndex.map((obj) =>
            fsPromises.writeFile(`./daemon-build/output/bluzelle${obj.index}.json`, JSON.stringify(obj.content))));

        return Promise.resolve(configsWithIndex);
    },

    writePeersList: async (configsWithIndex, {add} = {}) => {

        let peers = [];

        if (add) {
            try {
                let output = await fsPromises.readFile('./daemon-build/output/peers.json');
                peers = JSON.parse(output)
            } catch (err) {
                console.log('Error reading existing peers list. \n' , + err.stack)
            }
        }

        configsWithIndex.forEach(data => {
            peers.push(
                {
                    name: `daemon${data.index}`,
                    host: '127.0.0.1',
                    port: data.content.listener_port,
                    uuid: data.content.uuid,
                    http_port: data.content.http_port
                }
            )
        });

        await fsPromises.writeFile(`./daemon-build/output/peers.json`, JSON.stringify(peers), 'utf8');

        return peers
    },

    generateSwarmConfigsAndSetState: async (numOfConfigs) => {

        const configsWithIndex = await configUtils.generateConfigs(numOfConfigs);

        const peersList = await configUtils.writePeersList(configsWithIndex);

        configUtils.setHarnessState(configsWithIndex);

        return [configsWithIndex, peersList]
    },

    getSwarmObj: () => swarm,

    setHarnessState: (configsWithIndex) => {

        configsWithIndex.forEach(data => {

            swarm[`daemon${data.index}`] =
                {
                    uuid: data.content.uuid,
                    port: data.content.listener_port,
                    http_port: data.content.http_port,
                    index: data.index
                }
        });

        return swarm
    },

    resetHarnessState: () => {
        configCounter.reset();
        swarm = {};
    },

    getNewestNodes: (numOfNodesToReturn) => {

        const filteredDaemonList = Object.keys(swarm).filter(key => key.includes('daemon'));

        const newestNodes = filteredDaemonList.slice(- numOfNodesToReturn);

        return newestNodes
    }
};

module.exports = configUtils;

const configCounter = {
    counter: -1,
    increment() { return this.counter += 1 },
    reset() { this.counter = -1 }
};

function Config(keys, edits) {
    Object.entries(keys).forEach((key) => this[key[0]] = key[1]);

    if (edits) {
        Object.entries(edits).forEach(key => this[key[0]] = key[1])
    }
};

const readTemplate = path => JSON.parse(fs.readFileSync(path).toString());

const setValues = (fileContent, changes) => {

    // if editing an array like peers list file, pass in an index value to target changes

    for (let key in changes) {

        if (key === 'index') {
            continue;
        }

        if (changes.index || changes.index === 0) {

            fileContent[changes.index][key] = changes[key]
        } else {

            fileContent[key] = changes[key]
        }

    }
};

const removeValues = (fileContent, remove) =>
    fileContent.splice(remove.index, 1);

const delKey = (fileContent, deleteKey) =>
    Object.values(deleteKey).forEach(key =>
        delete fileContent[key]);
