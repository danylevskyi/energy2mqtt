#!/usr/bin/env node

console.log('Starting ENERGY2MQTT...');
const appName = 'ENERGY2MQTT';

const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Run app with required parameters. Environmental variables can be used instead of command line arguments.')
  .env(appName)
  .options({
    'modbus-id': {
      demand: false,
      type: 'integer',
      default: 1,
    },
    'modbus-host': {
      demand: true,
      type: 'string',
      description: 'Example: 192.168.10.48',
    },
    'modbus-port': {
      demand: true,
      type: 'integer',
    },
    'modbus-scan-interval': {
      demand: false,
      type: 'integer',
      default: 3000,
    },
    'mqtt-host': {
      demand: true,
      type: 'string',
      description: 'Example: mqtt://192.168.11.40',
    },
    'mqtt-port': {
      demand: false,
      type: 'number',
      default: 1883,
    },
    'mqtt-username': {
      demand: false,
      type: 'string',
    },
    'mqtt-password': {
      demand: false,
      type: 'string',
    },
    'mqtt-prefix': {
      demand: false,
      type: 'string',
      default: 'energy',
      description: 'MQTT topic prefix',
    },
  })
  .parse();

const debug = require('debug')(appName);
const ModbusRTU = require('modbus-serial');
const mqtt = require('mqtt');
const mapping = require('./mapping/sdm630.json');

const modbusClient = new ModbusRTU();

// Holds a status of Modbus.
let mbsStatus = 'Initializing...';

// Modbus 'state' constants.
const MBS_STATE_INIT = 'State init';
const MBS_STATE_IDLE = 'State idle';
const MBS_STATE_NEXT = 'State next';
const MBS_STATE_GOOD_READ = 'State good (read)';
const MBS_STATE_FAIL_READ = 'State fail (read)';
const MBS_STATE_GOOD_CONNECT = 'State good (connect)';
const MBS_STATE_FAIL_CONNECT = 'State fail (connect)';

let mbsState = MBS_STATE_INIT;

// Modbus TCP configuration values.
const mbsId = argv.modbusId;
const mbsPort = argv.modbusPort;
const mbsHost = argv.modbusHost;
const mbsScan = argv.modbusScanInterval;
const mbsTimeout = 5000;

const mqttServer = `${argv.mqttHost}:${argv.mqttPort}`;
const mqttOptions = {
  clientId: appName,
};

if (argv.mqttUsername) {
  mqttOptions.username = argv.mqttUsername;
}

if (argv.mqttPassword) {
  mqttOptions.password = argv.mqttPassword;
}

const connectModbusClient = function connectModbusClient() {
  debug('Connecting to Modbus server...');

  // Close port (NOTE: important in order not to create multiple connections)
  if (modbusClient.isOpen) {
    modbusClient.close();
  }

  // Set requests parameters.
  modbusClient.setID(mbsId);
  modbusClient.setTimeout(mbsTimeout);
  modbusClient
    .connectTCP(mbsHost, { port: mbsPort })
    .then(() => {
      mbsState = MBS_STATE_GOOD_CONNECT;
      mbsStatus = 'Connected, wait for reading...';
      debug(mbsStatus);
    })
    .catch((e) => {
      mbsState = MBS_STATE_FAIL_CONNECT;
      mbsStatus = e.message;
      console.log('Failed to connect to Modbus server.')
      debug(e);
    });
};

const readModbusData = function readModbusData() {
  modbusClient
    .readInputRegisters(0, 50)
    .then((data) => {
      const results = [];
      mapping.forEach((element) => {
        const value = data.buffer.readFloatBE(element.register, element.bytes).toFixed(element.toFixed);
        results.push({ id: element.id, value, unit: element.unit });
      });

      // Calculate total power value.
      let powerTotal = 0;
      results.forEach((element) => {
        if (element.unit === 'W') {
          powerTotal += parseInt(element.value, 10);
        }
      });

      results.push({
        id: 'powerTotal',
        value: powerTotal.toString(),
        unit: 'W',
      });

      debug(results);

      mbsState = MBS_STATE_GOOD_READ;

      const mqttClient = mqtt.connect(mqttServer, mqttOptions);

      mqttClient.on('connect', () => {
        results.forEach((element) => {
          mqttClient.publish(`${argv.mqttPrefix}/${element.id}/value`, element.value);
          mqttClient.publish(`${argv.mqttPrefix}/${element.id}/unit`, element.unit);
        });
        mqttClient.end();
      });

      mqttClient.on('error', (error) => {
        console.log('Failed to connect to MQTT server.')
        debug(error);
      });
    })
    .catch((e) => {
      mbsState = MBS_STATE_FAIL_READ;
      console.log('Failed to read Modbus data.')
      debug(e);
    });
};

const runModbus = function runModbus() {
  let nextAction;

  switch (mbsState) {
    case MBS_STATE_INIT:
      nextAction = connectModbusClient;
      break;

    case MBS_STATE_NEXT:
      nextAction = readModbusData;
      break;

    case MBS_STATE_GOOD_CONNECT:
      nextAction = readModbusData;
      break;

    case MBS_STATE_FAIL_CONNECT:
      nextAction = connectModbusClient;
      break;

    case MBS_STATE_GOOD_READ:
      nextAction = readModbusData;
      break;

    case MBS_STATE_FAIL_READ:
      nextAction = connectModbusClient;
      if (modbusClient.isOpen) {
        mbsState = MBS_STATE_NEXT;
      }
      break;

    default:
  }

  // Execute "next action" function if defined.
  if (nextAction !== undefined) {
    nextAction();
    mbsState = MBS_STATE_IDLE;
  }

  // Set for next run.
  setTimeout(runModbus, mbsScan);
};

runModbus();
