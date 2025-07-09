#include <bluefruit.h> // BLE coomunication
#include <PDM.h> // built-in PDM mic
#include "LSM6DS3.h" // XIAO BLE Sense LSM6DS3 Accelerometer Raw Data
#include "Wire.h"

/* 
This code is for sending packet ID, timestamp, bulit-in IMU, and built-in PDM mic data to client server.
written by Jiwan Kim @WIT_LAB (jiwankim@kaist.ac.kr, kjwan4435@gmail.com)

I modified below hyperparameters
- bluefruit.h       : BLE_GATT_ATT_MTU_MAX to 512 (default 23)
- PDMDoubleBuffer.h : DEFAULT_PDM_BUFFER_SIZE to 492 (default 512)

UUID setting
- UART Serivce: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
- UART RXD    : 6E400002-B5A3-F393-E0A9-E50E24DCCA9E
- UART TXD    : 6E400003-B5A3-F393-E0A9-E50E24DCCA9E
*/ 

static const int frequency = 16000; // audio sampling rate
static const char channels = 1; // default number of output channels
LSM6DS3 myIMU(I2C_MODE, 0x6A);  // IMU setting
int16_t ax, ay, az; // 2 btye each sensor data value
int16_t gx, gy, gz; // 2 btye each sensor data value
uint32_t timestamp; // 4 btye for timestamp

#define NONE            0
#define IMU_ONLY        1
#define PDM_ONLY        2
#define IMU_PDM_ASYNC   3
#define IMU_PDM_SYNC    4
#define BATCH           5

int protocol = 0; // change data sending mode by changing this preprocessor

// Buffer to read samples into, each sample is 16-bits
#define MAX_BUF_SIZE  243
#define IMU_BUF_SIZE  19    // 12 (IMU) + 4 (TS) + 2 (ID) + 1 (Header)
#define PDM_BUF_SIZE 224


// Number of audio samples read
volatile bool IsSamplesRead; // For multithreading
int packetID = 0;    // packet ID

byte imuBuffer_8bit[IMU_BUF_SIZE]; // buffer for sending IMU data

signed short pdmBuffer[int(PDM_BUF_SIZE/2)]; // as PDM MIC record in 16bit, we need to separate them manually
byte  pdmBuffer_8bit[PDM_BUF_SIZE + 2 + 1];  // 2 (ID) + 1 (Header)

byte  fullBuffer_8bit[MAX_BUF_SIZE]; // 1024 byte for audio byte array

int batch_recording_time = 2000; // change this value to change the recording time in the BATCH mode (unit: ms)
const int batch_time_duration_max = 4; // maximum time for transmitting batched information

signed short pdmBufferFullBatch[frequency * batch_time_duration_max];        // 5 seconds
signed short imuBufferFullBatch[300 * 6 * batch_time_duration_max];         // max 300 fs * 6 axis * 5 seconds
uint32_t timestampBufferFullBatch[200 * batch_time_duration_max]; // max 200 fs * 5 seconds

bool isSending = false;
uint32_t startRecordingTime;
int imuCounter = 0;
int pdmCounter = 0;

// BLE Service
BLEUart bleuart; // uart over ble

// GATT:  rule for data transmission
// GAP: advertising management layer
// Advertising: send device info GAP peripheral to central 
void startAdv(void)
{
  // Advertising packet
  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE); 
  Bluefruit.Advertising.addTxPower();

  //bleuart service enroll
  Bluefruit.Advertising.addService(bleuart);
  Bluefruit.ScanResponse.addName();

  /* Start Advertising
     * - Enable auto advertising if disconnected
     * - Interval:  fast mode = 20 ms, slow mode = 152.5 ms
     * - Timeout for fast mode is 30 seconds
     * - Start(timeout) with timeout = 0 will advertise forever (until
     * connected)
     *
     * For recommended advertising interval
     * https://developer.apple.com/library/content/qa/qa1931/_index.html
     */
  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 32);    // in unit of 0.625 ms
  Bluefruit.Advertising.setFastTimeout(30);      // number of seconds in fast mode
  Bluefruit.Advertising.start(0);                // 0 = Don't stop advertising after n seconds  
}

//연결시 수행되는 콜백 함수
void connect_callback(uint16_t conn_handle)
{
  // Get the reference to current connection
  BLEConnection* connection = Bluefruit.Connection(conn_handle);

  char central_name[32] = { 0 };
  connection->getPeerName(central_name, sizeof(central_name));
  delay(100);

  connection->requestPHY(BLE_GAP_PHY_2MBPS);  // set PHY to 2MBPS
  delay(100);
  connection->requestMtuExchange(512);

  Serial.print("Connected to ");
  Serial.println(central_name);

  protocol = NONE;
}

//연결 해제시 수행되는 콜백함수
void disconnect_callback(uint16_t conn_handle, uint8_t reason)
{
  (void) conn_handle;
  (void) reason;

  Serial.println();
  Serial.print("Disconnected, reason = 0x"); Serial.println(reason, HEX);
}

/**
 * Callback function to process the data from the PDM microphone.
 * NOTE: This callback is executed as part of an ISR.
 * Therefore using `Serial` to print messages inside this function isn't supported.
 * */
void onPDMdata() {
  // Read into the sample buffer
  PDM.read(pdmBuffer, PDM_BUF_SIZE);
  IsSamplesRead = true;
}


void initIMU(void){
  Wire.begin();
  delay(2000);

  if (myIMU.begin() != 0) {
    Serial.println("Device error");
  } else {
    Serial.println("Device OK!");
  }
}

void initPDM(void){
    // Configure the data receive callback
  PDM.onReceive(onPDMdata);

  // Optionally set the gain: 0 - 255, defaults to 20 if not specified (24 on the Portenta Vision Shield)
  PDM.setGain(255); // hard to get a good value here - check what is happening. Seems to be very quite or very loud, not inbetween
  PDM.setBufferSize(PDM_BUF_SIZE); // set customized PDM_BUFFER_SIZE

  // Initialize PDM with:
  // - one channel (mono mode)
  // - a 16 kHz sample rate for the Arduino Nano 33 BLE Sense
  // - a 32 kHz or 64 kHz sample rate for the Arduino Portenta Vision Shield
  if (!PDM.begin(channels, frequency)) {
    Serial.println("Failed to start PDM!");
    while (1);
  }
}

void initBLE(void){
  // Setup the BLE LED to be enabled on CONNECT
  Bluefruit.autoConnLed(true);

  // Config the peripheral connection with maximum bandwidth 
  // more SRAM required by SoftDevice
  // Note: All config***() function must be called before begin()
  Bluefruit.configPrphBandwidth(BANDWIDTH_MAX); // I modified configPrphBandwidth function in bluefruit.cpp
  Bluefruit.begin();
  Bluefruit.setTxPower(8); // NRF52840 can work up to 8dBm
  
  //콜백 함수 등록  
  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  // Connection interval: 7.5 ms ~ 4 secs.
  Bluefruit.Periph.setConnInterval(6, 12); // 7.5-15ms 

  // Configure and Start BLE Uart Service
  bleuart.begin();
}

void initLED(void){
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
}

void setup() {
  Serial.begin(115200);
  initLED();
  initIMU();
  initPDM();
  initBLE();

  // Set up and start advertising
  startAdv();
}

void sendIMU_realtime() {
  // Pointers for accessing the arrays
  byte* bytePtr = imuBuffer_8bit;
  packetID += 1;

  // built-in IMU sensor in the XIAO mcu
  ax = myIMU.readRawAccelX();
  ay = myIMU.readRawAccelY();
  az = myIMU.readRawAccelZ();
  gx = myIMU.readRawGyroX();
  gy = myIMU.readRawGyroX();
  gz = myIMU.readRawGyroX();
  timestamp = millis();

  // Write the two-byte ID field (0):
  *bytePtr++ = 'I';   // 0x49

  // Write two bytes for packetID (1-2)
  *bytePtr++ = (packetID >> 8) & 0xFF;  // High byte
  *bytePtr++ = packetID & 0xFF;         // Low byte

  // Write timestamp for next 4 bytes (3-6)
  *bytePtr++ = (timestamp >> 24) & 0xFF; 
  *bytePtr++ = (timestamp >> 16) & 0xFF;
  *bytePtr++ = (timestamp >> 8) & 0xFF;
  *bytePtr++ = timestamp & 0xFF; 

  // Write IMU data for next 12 bytes (7-18)
  *bytePtr++ = (ax >> 8) & 0xFF; *bytePtr++ = (ax & 0xFF);
  *bytePtr++ = (ay >> 8) & 0xFF; *bytePtr++ = (ay & 0xFF);
  *bytePtr++ = (az >> 8) & 0xFF; *bytePtr++ = (az & 0xFF);
  *bytePtr++ = (gx >> 8) & 0xFF; *bytePtr++ = (gx & 0xFF);
  *bytePtr++ = (gy >> 8) & 0xFF; *bytePtr++ = (gy & 0xFF);
  *bytePtr++ = (gz >> 8) & 0xFF; *bytePtr++ = (gz & 0xFF);

  bleuart.write(imuBuffer_8bit, 12+4+2+1);
}

void sendPDM_realtime(){
  // Wait for samples to be read
  if (IsSamplesRead){
    // Clear the read count
    IsSamplesRead = false;

    // Pointers for accessing the arrays
    byte* bytePtr = pdmBuffer_8bit;
    packetID += 1;

    // Write the two-byte ID field (0):
    *bytePtr++ = 'P';   // 0x49

    // Write two bytes for packetID (1-2)
    *bytePtr++ = (packetID >> 8) & 0xFF;  // High byte
    *bytePtr++ = packetID & 0xFF;         // Low byte

    signed short* shortPtr = pdmBuffer;
    for (int i = 0; i < int(PDM_BUF_SIZE/2); i++) {
      signed short value = *shortPtr++;
      *bytePtr++ = (value >> 8) & 0xFF; 
      *bytePtr++ = (value & 0xFF);
    }

    bleuart.write(pdmBuffer_8bit, PDM_BUF_SIZE + 1 + 2);
  }
}

void sendIMUPDM_realtime(){
  // Wait for samples to be read
  if (IsSamplesRead){
    // Clear the read count
    IsSamplesRead = false;

    // Pointers for accessing the arrays
    byte* bytePtr = fullBuffer_8bit;
    packetID += 1;

    // built-in IMU sensor in the XIAO mcu
    ax = myIMU.readRawAccelX();
    ay = myIMU.readRawAccelY();
    az = myIMU.readRawAccelZ();
    gx = myIMU.readRawGyroX();
    gy = myIMU.readRawGyroX();
    gz = myIMU.readRawGyroX();
    timestamp = millis();

    // Write the two-byte ID field (0):
    *bytePtr++ = 'F';   // 0x49

    // Write two bytes for packetID (1-2)
    *bytePtr++ = (packetID >> 8) & 0xFF;  // High byte
    *bytePtr++ = packetID & 0xFF;         // Low byte

    // Write timestamp for next 4 bytes (3-6)
    *bytePtr++ = (timestamp >> 24) & 0xFF; 
    *bytePtr++ = (timestamp >> 16) & 0xFF;
    *bytePtr++ = (timestamp >> 8) & 0xFF;
    *bytePtr++ = timestamp & 0xFF; 

    // Write IMU data for next 12 bytes (7-18)
    *bytePtr++ = (ax >> 8) & 0xFF; *bytePtr++ = (ax & 0xFF);
    *bytePtr++ = (ay >> 8) & 0xFF; *bytePtr++ = (ay & 0xFF);
    *bytePtr++ = (az >> 8) & 0xFF; *bytePtr++ = (az & 0xFF);
    *bytePtr++ = (gx >> 8) & 0xFF; *bytePtr++ = (gx & 0xFF);
    *bytePtr++ = (gy >> 8) & 0xFF; *bytePtr++ = (gy & 0xFF);
    *bytePtr++ = (gz >> 8) & 0xFF; *bytePtr++ = (gz & 0xFF);

    signed short* shortPtr = pdmBuffer;
    for (int i = 0; i < int(PDM_BUF_SIZE/2); i++) {
      signed short value = *shortPtr++;
      *bytePtr++ = (value >> 8) & 0xFF; 
      *bytePtr++ = (value & 0xFF);
    }

    // send byte array data through BLEUART
    bleuart.write(fullBuffer_8bit, MAX_BUF_SIZE);
  }
}

void readBLEUART() {
  // check the recieved character from computure(to start recording), and if the character recieved, change the 'sendingData' state.
  if ( bleuart.available()) {
    uint8_t ch = (uint8_t) bleuart.read();
    if (ch == 's'){
      Serial.println("sending data...");
      isSending = true;
      startRecordingTime = millis();
      Serial.print(", record start: "); Serial.println(String(startRecordingTime));
    }
    else if (ch == '1') {
      protocol = IMU_ONLY;
      Serial.println("MODE: IMU_ONLY");
    }
    else if (ch == '2') {
      protocol = PDM_ONLY;
      Serial.println("MODE: PDM_ONLY");
    }
    else if (ch == '3') {
      protocol = IMU_PDM_ASYNC;
      Serial.println("MODE: IMU_PDM_ASYNC");
    }
    else if (ch == '4') {
      protocol = IMU_PDM_SYNC;
      Serial.println("MODE: IMU_PDM_SYNC");
    }
    else if (ch == '5') {
      protocol = BATCH;
      Serial.println("MODE: BATCH");
    }
  }
}

void saveIMUBatch(){
  ax = myIMU.readRawAccelX();
  ay = myIMU.readRawAccelY();
  az = myIMU.readRawAccelZ();
  gx = myIMU.readRawGyroX();
  gy = myIMU.readRawGyroX();
  gz = myIMU.readRawGyroX();
  timestamp = millis();



  imuBufferFullBatch[imuCounter * 6]     = ax;
  imuBufferFullBatch[imuCounter * 6 + 1] = ay;
  imuBufferFullBatch[imuCounter * 6 + 2] = az;
  imuBufferFullBatch[imuCounter * 6 + 3] = gx;
  imuBufferFullBatch[imuCounter * 6 + 4] = gy;
  imuBufferFullBatch[imuCounter * 6 + 5] = gz;
  timestampBufferFullBatch[imuCounter] = timestamp;
    
  imuCounter ++;
}

void savePDMBatch(){
  // Wait for samples to be read
  if (IsSamplesRead){
    
    for (int i = 0; i < int(PDM_BUF_SIZE/2); i++) {
      pdmBufferFullBatch[pdmCounter * int(PDM_BUF_SIZE/2) + i] = pdmBuffer[i];
    }
    pdmCounter ++;
    
    IsSamplesRead = false;
  }
}

void sendIMUBatch(){
  // send full IMU data through ble 
  for (int i = 0; i < imuCounter; i++) {
    byte* bytePtr = imuBuffer_8bit;
    *bytePtr++ = 'B'; // 1 byte
    
    *bytePtr++ = (timestampBufferFullBatch[i] >> 24) & 0xFF; // time stamp 4 byte
    *bytePtr++ = (timestampBufferFullBatch[i] >> 16) & 0xFF;
    *bytePtr++ = (timestampBufferFullBatch[i] >> 8) & 0xFF;
    *bytePtr++ = timestampBufferFullBatch[i] & 0xFF; 

    // 6*2 byte IMU data
    *bytePtr++ = (imuBufferFullBatch[i*6] >> 8) & 0xFF; *bytePtr++ = (imuBufferFullBatch[i*6] & 0xFF);
    *bytePtr++ = (imuBufferFullBatch[i*6 + 1] >> 8) & 0xFF; *bytePtr++ = (imuBufferFullBatch[i*6 + 1] & 0xFF);
    *bytePtr++ = (imuBufferFullBatch[i*6 + 2] >> 8) & 0xFF; *bytePtr++ = (imuBufferFullBatch[i*6 + 2] & 0xFF);
    *bytePtr++ = (imuBufferFullBatch[i*6 + 3] >> 8) & 0xFF; *bytePtr++ = (imuBufferFullBatch[i*6 + 3] & 0xFF);
    *bytePtr++ = (imuBufferFullBatch[i*6 + 4] >> 8) & 0xFF; *bytePtr++ = (imuBufferFullBatch[i*6 + 4] & 0xFF);
    *bytePtr++ = (imuBufferFullBatch[i*6 + 5] >> 8) & 0xFF; *bytePtr++ = (imuBufferFullBatch[i*6 + 5] & 0xFF);

    bleuart.write(imuBuffer_8bit, 1+4+12);
  }
  imuCounter = 0;
}

void sendPDMBatch(){

  signed short* shortPtr = pdmBufferFullBatch;

  // send full PDM data through ble 
  for (int i = 0; i < pdmCounter; i++) {
    // Pointers for accessing the arrays
    byte* bytePtr = pdmBuffer_8bit;

    // Write the two-byte ID field (0):
    *bytePtr++ = 'B';
    *bytePtr++ = i;
    for (int i = 0; i < int(PDM_BUF_SIZE/2); i++) {
      signed short value = *shortPtr++;
      *bytePtr++ = (value >> 8) & 0xFF; 
      *bytePtr++ = (value & 0xFF);
    }
    bleuart.write(pdmBuffer_8bit, PDM_BUF_SIZE + 1 + 1);
  }
  pdmCounter = 0;
}

void sendBatchData(int sendingTime) {
  readBLEUART();
  if (isSending && ((millis() - startRecordingTime) < sendingTime) ) {
    saveIMUBatch();
    savePDMBatch();
  } else if (isSending && ((millis() - startRecordingTime) > sendingTime) ) {
    isSending = false;
    sendIMUBatch();
    sendPDMBatch();
    bleuart.write('e');
  }
}

void loop() {
  readBLEUART();
  if (protocol == IMU_ONLY) {
    sendIMU_realtime();
  } else if (protocol == PDM_ONLY) {
    sendPDM_realtime();
  } else if (protocol == IMU_PDM_ASYNC) {
    sendIMU_realtime();
    sendPDM_realtime();
  } else if (protocol == IMU_PDM_SYNC) {
    sendIMUPDM_realtime();
  } else if (protocol == BATCH) {
    sendBatchData(batch_recording_time);
  } else {
    Serial.println("Protocol doesn't exist");
  }
}
