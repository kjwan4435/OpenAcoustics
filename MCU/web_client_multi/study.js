function startInHandBlock(){
    currentBlock += 1;
    dataArray = [];
    currentCondition = 'InHand';

    trialSet = initTrialBlock(currentCondition, NofGestures, NofReps);

    speak("To Start Block " + (currentBlock+1) + ", Please Click The Button");
}

function startTableTopBlock(){
    currentBlock += 1;
    dataArray = [];
    currentCondition = "TableTop";

    trialSet = initTrialBlock(currentCondition, NofGestures, NofReps);

    speak("To Start Block " + (currentBlock+1) + ", Please Click The Button");
}

function initTrialBlock(condition, gestureNum, reps){
    var trials = [];
  
    for (let r=0;r<reps;r++){
      for (let g=0;g<gestureNum;g++){
        trials.push(trialFactory(condition, g));   
      }         
    }
  
    trials.sort(()=>Math.random() - 0.5);
    return trials;
}

function trialFactory(condition, gestureNum) {
    return {
      condition,
      gestureNum,
      trialStartTime:0,
      trialEndTime:0,
      isCorrect:false,
      startTrial(currentTime){
        this.trialStartTime = currentTime;
      },
      endTrial(currentTime){
        this.trialEndTime = currentTime;
      }
    }
}


function trialInitStart(){
    if (!isRecording) {
        if (trialSet.length == 0){
            speak("Block Finished");
            downloadCSV();
            currentBlock += 1;
        } else {
            // beep();
            let trial = trialSet.shift();
            currentGesture = trial.gestureNum;
            setTimeout(trialStart, 500);
        }
    }
}

function trialStart(){
    isRecording=true;
  
    if (currentGesture == 0){
      speak("Thumb Tap");
    } else if (currentGesture == 1){
      speak("Index Tap");
    } else if (currentGesture == 2){
      speak("Middle Tap");
    } else if (currentGesture == 3){
      speak("Swipe Left");
    } else if (currentGesture == 4){
      speak("Swipe Right");
    } else if (currentGesture == 5){
      speak("Swipe Up");
    } else if (currentGesture == 6){
      speak("Swipe Down");
    } 

    setTimeout(trialEndStart, 3000);
}

function trialEndStart(){
    beep(600);
    isRecording = false;
    currentTrial += 1;
}