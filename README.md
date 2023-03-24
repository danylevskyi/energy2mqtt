# Energy2MQTT

Energy2MQTT is a dockerized Node.js app that reads data from Eastron SDM energy meters via Modbus TCP server and
publishes it to MQTT.

## Hardware Setup

- Eastron SDM energy meter (tested with SDM630)
- Modbus TCP server (tested with HF2211)

## Quick Start

```sh
docker run  \
  -e "ENERGY2MQTT_MODBUS_ID=1" \
  -e "ENERGY2MQTT_MODBUS_HOST=192.168.10.48" \
  -e "ENERGY2MQTT_MODBUS_PORT=9999" \
  -e "ENERGY2MQTT_MODBUS_SCAN_INTERVAL=3000" \
  -e "ENERGY2MQTT_MQTT_HOST=mqtt://192.168.11.40" \
  -e "ENERGY2MQTT_MQTT_PORT=1883" \
  -e "ENERGY2MQTT_MQTT_USERNAME=secret" \
  -e "ENERGY2MQTT_MQTT_PASSWORD=secret" \
  -e "ENERGY2MQTT_MQTT_PREFIX=energy" \
  --name energy2mqtt \
  --restart always \
  danylevskyi/energy2mqtt
```

To run debug just add environment variable `DEBUG=ENERGY2MQTT`.

## HF2211 configuration

```xml
<!--UART Config-->
<UART key='Baudrate' value='9600'>
<UART key='Databits' value='8'>
<UART key='Stopbits' value='1'>
<UART key='Parity' value='NONE'>
<UART key='FlowCtrl' value='Disable'>
<UART key='Software FlowCtrl' value='Disable'>
<UART key='Xon' value='11'>
<UART key='Xoff' value='13'>
<UART key='Protocol' value='Modbus'>
<UART key='Frame Length' value='16'>
<UART key='Frame Time' value='100'>
<UART key='Tag Enable' value='Disable'>
<UART key='Tag Head' value='00'>
<UART key='Tag Tail' value='00'>
<UART key='Buffer Size' value='1024'>
<UART key='gapTime Size' value='50'>
<UART key='cliGetin' value='0'>
<UART key='serialStr' value='+++'>
<UART key='waitTime' value='300'>
```

```xml
<!--SOCK Config-->
<SOCK name='TCP' key='Name' value='TCP'>
<SOCK name='TCP' key='Protocol' value='TCP-SERVER'>
<SOCK name='TCP' key='Server Addr' value=''>
<SOCK name='TCP' key='Remote Port' value='0'>
<SOCK name='TCP' key='Local Port' value='9999'>
<SOCK name='TCP' key='Buffer Size' value='512'>
<SOCK name='TCP' key='KeepAlive' value='60'>
<SOCK name='TCP' key='Timeout' value='15'>
<SOCK name='TCP' key='Security' value='NONE'>
<SOCK name='TCP' key='Connect Mode' value='Always'>
<SOCK name='TCP' key='VcomEn' value='0'>
<SOCK name='TCP' key='Rout' value='uart'>
<SOCK name='TCP' key='maxAccept' value='10'>
```

## How to run node app with debug

```sh
npm install
DEBUG="ENERGY2MQTT" node index.js \
  --modbus-id 1 \
  --modbus-host 192.168.10.48 \
  --modbus-port 9999 \
  --modbus-scan-interval 3000 \
  --mqtt-host mqtt://192.168.11.40 \
  --mqtt-port 1883 \
  --mqtt-username secret \
  --mqtt-password secret \
  --mqtt-prefix energy2mqtt
```

## Credits

Big thanks [@podarok](https://github.com/podarok) the guys from [Jet.Dev](https://jet.dev/) for the help and inspiration.
