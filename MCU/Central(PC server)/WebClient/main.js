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
    // Get references to HTML elements
    connectBtn = document.getElementById('connectBtn');
    recordingBtn = document.getElementById('recordingBtn');
    playBtn = document.getElementById('playBtn');
    downloadBtn = document.getElementById('downloadBtn');
    batchRecordingBtn = document.getElementById('batchRecordingBtn');
    
    IMUOnlyBtn = document.getElementById('imuOnlyBtn');
    PDMOnlyBtn = document.getElementById('pdmOnlyBtn');
    IMUPDMAsyncBtn = document.getElementById('imuPdmAsyncBtn');
    IMUPDMSyncBtn = document.getElementById('imuPdmSyncBtn');
    BatchBtn = document.getElementById('batchBtn');
    
    subjectTextView = document.getElementById('subjectInput');
    
    // Check if all elements were found
    if (!connectBtn || !recordingBtn || !playBtn || !downloadBtn || !batchRecordingBtn ||
        !IMUOnlyBtn || !PDMOnlyBtn || !IMUPDMAsyncBtn || !IMUPDMSyncBtn || !BatchBtn || !subjectTextView) {
        console.error('Some HTML elements not found. Please check element IDs.');
        return;
    }
    
    // Add event listeners
    connectBtn.addEventListener('click', bleConnect);
    recordingBtn.addEventListener('click', handleRecording);
    playBtn.addEventListener('click', playSound);
    downloadBtn.addEventListener('click', downloadData);
    batchRecordingBtn.addEventListener('click', batchRecording);
    
    IMUOnlyBtn.addEventListener('click', IMUonlyMode);
    PDMOnlyBtn.addEventListener('click', PDMonlyMode);
    IMUPDMAsyncBtn.addEventListener('click', IMUPDMAsyncMode);
    IMUPDMSyncBtn.addEventListener('click', IMUPDMSyncMode);
    BatchBtn.addEventListener('click', BatchMode);
    
    // Initialize mode descriptions
    initializeModeDescriptions();
    
    // Initialize status indicators
    initializeStatusIndicators();
    
    // Create offscreen buffer for any drawing needs
    offscreen = createGraphics(800, 600);
    offscreen.background(200);
    offscreen.stroke(128); 
    offscreen.noFill(); 
    offscreen.rect(0, 0, offscreen.width, offscreen.height);
}

/*
 * Initialize mode descriptions
 */
function initializeModeDescriptions() {
    const modeDescriptions = {
        'imuOnlyBtn': 'Real-time streaming of IMU data only (accelerometer and gyroscope)',
        'pdmOnlyBtn': 'Real-time streaming of PDM microphone data only (16 kHz, 16-bit audio)',
        'imuPdmAsyncBtn': 'Real-time streaming of both IMU and PDM data in separate packets',
        'imuPdmSyncBtn': 'Real-time streaming of both IMU and PDM data in synchronized packets',
        'batchBtn': 'Buffered data transmission - collects data for 2 seconds then transmits'
    };
    
    // Add click listeners to mode buttons for descriptions
    Object.keys(modeDescriptions).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                updateModeDescription(modeDescriptions[btnId]);
            });
        }
    });
}

/*
 * Update mode description
 */
function updateModeDescription(description) {
    const modeDescElement = document.getElementById('modeDescription');
    if (modeDescElement) {
        modeDescElement.textContent = description;
    }
}

/*
 * Initialize status indicators
 */
function initializeStatusIndicators() {
    // Status indicators are now handled by HTML/CSS
    // This function can be used for any additional initialization
}

/*
 * Update connection status display
 */
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (connected) {
            statusElement.className = 'connection-status connected';
            statusElement.innerHTML = '<span>🟢 Connected</span>';
        } else {
            statusElement.className = 'connection-status disconnected';
            statusElement.innerHTML = '<span>🔴 Disconnected</span>';
        }
    }
}

/*
 * Update data summary
 */
function updateDataSummary() {
    const dataInfoElement = document.getElementById('dataInfo');
    const dataSummaryElement = document.getElementById('dataSummary');
    
    if (dataInfoElement && dataSummaryElement) {
        const motionCount = MotionDataArray.length;
        const soundCount = SoundDataArray.length;
        
        if (motionCount > 0 || soundCount > 0) {
            dataInfoElement.style.display = 'block';
            
            dataSummaryElement.innerHTML = `
                <strong>Motion Data:</strong> ${motionCount} packets<br>
                <strong>Audio Data:</strong> ${soundCount} packets
            `;
        } else {
            dataInfoElement.style.display = 'none';
        }
    }
}

/*
 * function for the window resizing
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(200);
}

/*
 * Update mode button active state
 */
function updateModeButtonActive(activeButtonId) {
    // Remove active class from all mode buttons
    const modeButtons = ['imuOnlyBtn', 'pdmOnlyBtn', 'imuPdmAsyncBtn', 'imuPdmSyncBtn', 'batchBtn'];
    modeButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('active');
        }
    });
    
    // Add active class to selected button
    const activeBtn = document.getElementById(activeButtonId);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

/*
 * Show/hide batch mode controls
 */
function toggleBatchModeControls(show) {
    const recordingBtn = document.getElementById('recordingBtn');
    const batchRecordingBtn = document.getElementById('batchRecordingBtn');
    const batchIndicators = document.getElementById('batchIndicators');
    
    if (recordingBtn && batchRecordingBtn && batchIndicators) {
        if (show) {
            // Hide regular recording button, show batch controls
            recordingBtn.style.display = 'none';
            batchRecordingBtn.style.display = 'block';
            batchIndicators.style.display = 'flex';
        } else {
            // Show regular recording button, hide batch controls
            recordingBtn.style.display = 'block';
            batchRecordingBtn.style.display = 'none';
            batchIndicators.style.display = 'none';
        }
    }
}

/*
 * Update batch status indicators
 */
function updateBatchStatus(status) {
    const batchStatusCircle = document.getElementById('batchStatusCircle');
    const batchStatusLabel = document.getElementById('batchStatusLabel');
    
    if (batchStatusCircle && batchStatusLabel) {
        switch(status) {
            case 'standby':
                batchStatusCircle.style.background = '#28a745';
                batchStatusCircle.textContent = 'STANDBY';
                batchStatusLabel.textContent = 'Ready to record';
                break;
            case 'recording':
                batchStatusCircle.style.background = '#dc3545';
                batchStatusCircle.textContent = 'RECORDING';
                batchStatusLabel.textContent = 'Collecting data...';
                break;
            case 'sending':
                batchStatusCircle.style.background = '#17a2b8';
                batchStatusCircle.textContent = 'SENDING';
                batchStatusLabel.textContent = 'Transmitting data...';
                break;
        }
    }
}

function handleRecording() {
  if (isRecording) {
    recordingBtn.textContent = 'Start Recording';
    recordingBtn.className = 'btn btn-success';
    isRecording = false;
    updateDataSummary();
  } else {
    recordingBtn.textContent = 'Stop Recording';
    recordingBtn.className = 'btn btn-danger';
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
  updateBatchStatus('recording');
}

function IMUonlyMode() {
  sendCharacteristics('1');
  updateModeButtonActive('imuOnlyBtn');
  toggleBatchModeControls(false);
  isBatchMode = false;
}

function PDMonlyMode() {
  sendCharacteristics('2');
  updateModeButtonActive('pdmOnlyBtn');
  toggleBatchModeControls(false);
  isBatchMode = false;
}

function IMUPDMAsyncMode() {
  sendCharacteristics('3');
  updateModeButtonActive('imuPdmAsyncBtn');
  toggleBatchModeControls(false);
  isBatchMode = false;
}

function IMUPDMSyncMode() {
  sendCharacteristics('4');
  updateModeButtonActive('imuPdmSyncBtn');
  toggleBatchModeControls(false);
  isBatchMode = false;
}

function BatchMode() {
  sendCharacteristics('5');
  updateModeButtonActive('batchBtn');
  toggleBatchModeControls(true);
  isBatchMode = true;
  updateBatchStatus('standby');
}
