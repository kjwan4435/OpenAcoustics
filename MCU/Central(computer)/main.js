let myBLE = new p5ble();
let isConnected = false;

const serviceUUID      = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const txCharacteristicUUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const rxCharacteristicUUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// full characteristic
let txChar;
let rxChar;

// rxData
let myValue = 0;

// variables for the display of the data
let SHOW_DATA = 0;
let chart = SHOW_DATA;

// text
let textDelay = 1000/5; 
let lastTextms = 0; 

// drawing
let offscreen; 
let xPos = 0;                           // x position of the graph
let chartData = [0, 0, 0, 0,   0, 0, 0, 0];

/*
 * UI elements
 */
let connectBtn;
let recordingBtn;
let playBtn;
let downloadBtn;

let IMUOnlyBtn;
let PDMOnlyBtn;
let IMUPDMAsyncBtn;
let IMUPDMSyncBtn;
let BatchBtn;

let modeIndicator;
let StanbyCircle; 
let RecordingCircle;
let SendingCircle;

// data save
let currentTrial=0;
let currentBlock=0;
let currentCondition=0;
let currentGesture=0;
let MotionDataArray = [];
let SoundDataArray = [];
let isRecording = false;
let trialSet = [];
let batchState = 0; // indicates the current state (0 : stanby, 1 : recording, 2 : sending)
let isBatchMode = false;

// click markers
let isClicked = false;
let clickCounter = {
  clickInternal: 0,
  clickListener: function(val) {},
  set click(val) {
    this.clickInternal = val;
    this.clickListener(val);
  },
  get click() {
    return this.clickInternal;
  },
  registerListener: function(listener) {
    this.clickListener = listener;
  },
  unregisterListner: function() {
    this.clickListener = function() {console.log("No Listener");}
  }
}

// study parameters
let NofGestures = 7;
let NofReps = 1;
let NofCondition = 2;

/*
 * Setup - config graphics.  
 */
function setup() {
    // Create UI
    connectBtn = createButton('Connect Device') 
    connectBtn.mousePressed(bleConnect); 

    recordingBtn = createButton('Start Recording') 
    recordingBtn.mousePressed(handleRecording); 

    playBtn = createButton('Play Sound');
    playBtn.mousePressed(playSound);

    downloadBtn = createButton('Download Data');
    downloadBtn.mousePressed(downloadData);

    batchRecordingBtn = createButton('Batch Record');
    batchRecordingBtn.mousePressed(batchRecording);

    IMUOnlyBtn = createButton('IMU ONLY');
    IMUOnlyBtn.mousePressed(IMUonlyMode); 

    PDMOnlyBtn = createButton('PDM ONLY');
    PDMOnlyBtn.mousePressed(PDMonlyMode); 

    IMUPDMAsyncBtn = createButton('IMU + PDM Async');
    IMUPDMAsyncBtn.mousePressed(IMUPDMAsyncMode); 

    IMUPDMSyncBtn = createButton('IMU + PDM Sync');
    IMUPDMSyncBtn.mousePressed(IMUPDMSyncMode); 

    BatchBtn = createButton('Batch');
    BatchBtn.mousePressed(BatchMode); 

    subjectTextView = document.createElement('input');
    subjectTextView.name = 'subjectTextView';
    subjectTextView.type = 'text';
    subjectTextView.value = '9999';
    subjectTextView.placeholder = "subject number";

    // resize the window and hide ui (as we are disconnected)
    drawModeIndicator();
    windowResized();
    drawTextIntro();
    

    offscreen = createGraphics(width/5*4,height/5*3); // create offscreen buffer
    offscreen.background(200);
    offscreen.stroke(128); 
    offscreen.noFill(); 
    offscreen.rect(0, 0, offscreen.width, offscreen.height);

    modeIndicator.display();
    StanbyCircle.display();
    RecordingCircle.display();
    SendingCircle.display();
}

/*
 * function for the window resizing
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(200);
  
  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);
  let termY  = 3;
  
  connectBtn.position(gGap, hGap*3);
  connectBtn.size(bWidth);  
  
  recordingBtn.position(gGap*2 + bWidth, hGap*7.5);
  recordingBtn.size(bWidth);
  
  playBtn.position(gGap*3 + bWidth*2, hGap*7);
  playBtn.size(bWidth);   
  
  downloadBtn.position(gGap*3 + bWidth*2, hGap*9);
  downloadBtn.size(bWidth);

  batchRecordingBtn.position(gGap*2 + bWidth, hGap*10);
  batchRecordingBtn.size(bWidth);

  IMUOnlyBtn.position(gGap, hGap*6);
  IMUOnlyBtn.size(bWidth);

  PDMOnlyBtn.position(gGap,hGap*7);
  PDMOnlyBtn.size(bWidth);

  IMUPDMAsyncBtn.position(gGap,hGap*8);
  IMUPDMAsyncBtn.size(bWidth);

  IMUPDMSyncBtn.position(gGap, hGap*9);
  IMUPDMSyncBtn.size(bWidth);

  BatchBtn.position(gGap, hGap*10);
  BatchBtn.size(bWidth);
  
  subjectTextView.style.position = 'absolute';
  subjectTextView.style.left = gGap*3 + bWidth*2;
  subjectTextView.style.top = hGap;
  subjectTextView.style.width = bWidth;
  document.body.appendChild(subjectTextView);

  modeIndicator.relocate(gGap*0.75, hGap*9.25);
  modeIndicator.display();
}

function drawTextIntro() {
    let bWidth = windowWidth / 4;  
    let gGap   = bWidth / 4; 
    let hGap   = max(30, windowHeight / 20);  
    
    background(200); 
    fill(0);
    textSize(24); 
    textAlign(CENTER, CENTER);
    text("BLE UART SERVER", width/2, hGap);

    // draw white background rectangle for each sequence
    fill(255, 255, 255);
    rectMode(CENTER);
    rect(gGap*3, hGap*2.8, bWidth*1.25, hGap*2, 10);

    fill(255, 255, 255);
    rectMode(CENTER);
    rect(gGap*3, hGap*8, bWidth*1.25, hGap*6, 10);

    fill(255, 255, 255);
    rectMode(CENTER);
    rect(gGap*4 + bWidth, hGap*8, bWidth*1.25, hGap*6, 10);
    
    fill(255, 255, 255);
    rectMode(CENTER);
    rect(gGap*5 + bWidth*2, hGap*8, bWidth*1.25, hGap*6, 10);

    // draw line for the more easiler understanding of recording system
    stroke(color(0,0,0));             
    line(bWidth + gGap*1.1, hGap*6.25, bWidth + gGap*1.9, hGap*7.75); 

    line(bWidth + gGap*1.1, hGap*7.25, bWidth + gGap*1.9, hGap*7.75); 

    line(bWidth + gGap*1.1, hGap*8.25, bWidth + gGap*1.9, hGap*7.75); 

    line(bWidth + gGap*1.1, hGap*9.25, bWidth + gGap*1.9, hGap*7.75); 

    line(bWidth + gGap*1.1, hGap*10.25, bWidth + gGap*1.9, hGap*10.25); 
    // draw text for the sequence
    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("1. Connect BLE devices",gGap*3, hGap*2.5);

    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("2. Select mode",gGap*3, hGap*5.5);

    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("3. Capture Audio/IMU data",gGap*4 + bWidth, hGap*5.5);

    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("4. Check & Download captured data",gGap*5 + bWidth*2, hGap*5.5);
    // draw text for the batch state indicators

    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("STANBY", gGap*2 + bWidth, hGap*12);

    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("RECORDING", gGap*4 + bWidth, hGap*12);

    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("RECEIVING", gGap*6 + bWidth, hGap*12);
}

function drawModeIndicator() {

  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);  

  modeIndicator = new Circle(gGap*0.75, hGap*9.25 , 10, color(255, 255, 255));
  StanbyCircle = new Circle( gGap*2 + bWidth, hGap*13 , 30, color(180, 220, 180));
  RecordingCircle = new Circle( gGap*4 + bWidth, hGap*13 , 30, color(220, 180, 180));
  SendingCircle = new Circle( gGap*6 + bWidth, hGap*13 , 30, color(180, 180, 220));

}

function handleRecording() {
  if (isRecording) {
    recordingBtn.elt.textContent = 'Start Recording'
    isRecording = false;
  } else {
    recordingBtn.elt.textContent = 'Stop Recording'
    MotionDataArray = [];
    SoundDataArray = [];
    isRecording = true;
  }
}

function batchRecording(){
  MotionDataArray = [];
  SoundDataArray = [];
  sendCharacteristics('s');
  batchState = 1;
  // change the color of the indicators

  StanbyCircle.changeColor(color(180,220,180));
  StanbyCircle.display();
  RecordingCircle.changeColor(color(255,0,0));
  RecordingCircle.display();
}

function IMUonlyMode() {

  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);  

  sendCharacteristics('1');
  
  modeIndicator.changeColor(color(0,0,0));
  modeIndicator.relocate(gGap*0.75, hGap*6.27);
  modeIndicator.display();

  turnOffIndicators();
}

function PDMonlyMode() {

  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);  

  sendCharacteristics('2');

  modeIndicator.changeColor(color(0,0,0));
  modeIndicator.relocate(gGap*0.75, hGap*7.27);
  modeIndicator.display();

  turnOffIndicators();
}

function IMUPDMAsyncMode() {

  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);  

  sendCharacteristics('3');

  modeIndicator.changeColor(color(0,0,0));
  modeIndicator.relocate(gGap*0.75, hGap*8.27);
  modeIndicator.display();

  turnOffIndicators();
}

function IMUPDMSyncMode() {

  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);  

  sendCharacteristics('4');

  modeIndicator.changeColor(color(0,0,0));
  modeIndicator.relocate(gGap*0.75, hGap*9.27);
  modeIndicator.display();

  turnOffIndicators();
}

function BatchMode() {

  let bWidth = windowWidth / 4;  
  let gGap   = bWidth / 4; 
  let hGap   = max(30, windowHeight / 20);  

  sendCharacteristics('5');
  isBatchMode = true;

  modeIndicator.changeColor(color(0,0,0));
  modeIndicator.relocate(gGap*0.75, hGap*10.27);
  modeIndicator.display();

  StanbyCircle.changeColor(color(0,255,0));
  StanbyCircle.display();
}

function turnOffIndicators() {

  StanbyCircle.changeColor(color(180,220,180));
  StanbyCircle.display();

  RecordingCircle.changeColor(color(220,180,180));
  RecordingCircle.display();

  SendingCircle.changeColor(color(180,180,220));
  SendingCircle.display();
}
