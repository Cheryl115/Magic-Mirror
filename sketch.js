// web serial
let pHtmlMsg; //pointer to the msg text
let serialOptions = { baudRate: 9600  }; // define the transimition rate
let serial;

// Check if the filter is active, and send it to Arduino, this appraoch is to help to reduce the useless data exchange.
let filterActive = false;


// Like an image, we need a variable to connect our webcam to our sketch
let video;

// Check if webcam is active
let webcamActive = false;

// variable for button
let btn_U, btn_D, btn_L, btn_R;

let joystickDirection;
let buttonState;

// For AR Filter
let faceMesh;
let faces = [];
let currentfilter;

// store images
let happyImg, sadImg, partyImg, hungryImg, withoutImg;

// store songs
let happySound, sadSound, partySound, hungrySound;
let playingSound = null;

// set the canvas to be the same as css style
let canvasContainer = document.querySelector(".canvas-container");
let w=canvasContainer.clientWidth;
let h=canvasContainer.clientHeight;

function preload(){
  // preload the media, cause those image will be used multiple time, to save time and make it more efficient, preload those materials
  // load images
  happyImg = loadImage("./Images/happy-stars.png");
  sadImg = loadImage("./Images/water.png");
  partyImg = loadImage("./Images/racoon-pedro.gif");
  hungryImg = loadImage("./Images/hungry.png");
  withoutImg = loadImage("./Images/blank.png");


  // load sounds
  happySound = loadSound("./Sounds/happy-happy-happy-cat.mp3");
  sadSound = loadSound("./Sounds/sad-meow-song.mp3");
  partySound = loadSound("./Sounds/pedro-pedro-pe.mp3");
  hungrySound = loadSound("./Sounds/hungry-sound.mp3");

  // load the facemesh model, limit the face num to 1
  faceMesh = ml5.faceMesh({maxFaces: 1});
}

function setup() {
  let canvas = createCanvas(w, h);

  // Setup Web Serial using serial.js
  serial = new Serial();
  serial.on(SerialEvents.CONNECTION_OPENED, onSerialConnectionOpened);
  serial.on(SerialEvents.CONNECTION_CLOSED, onSerialConnectionClosed);
  serial.on(SerialEvents.DATA_RECEIVED, onSerialDataReceived);
  serial.on(SerialEvents.ERROR_OCCURRED, onSerialErrorOccurred);
  
  // If we have previously approved ports, attempt to connect with them
  serial.autoConnectAndOpenPreviouslyApprovedPort(serialOptions);

  // Create a video capture (aka webcam input)
  video = createCapture(VIDEO);
  
  // Specify the resolution of the webcam input (too high and you may notice performance issues, especially if you're extracting info from it or adding filters)
  video.size(w, h);
    
  // In some browsers, you may notice that a second video appears onscreen! That's because p5js actually creates a <video> html element, which then is piped into the canvas – the added command below ensures we don't see it :)
  video.hide();
  
  // parent the canvas to the container
  canvas.parent(canvasContainer);
  
  // AR Filter

  // start detecting faces from webcam video
  faceMesh.detectStart(video, gotFaces);

  currentfilter = withoutImg;

  pHtmlMsg = createP("");

}

function gotFaces(results){
  faces = results;
}

function draw() { 

  background(240);
  // The original plans is to use ultrasonic sensor to start webcam, however, it is unstable
  // open the webcam when the distance <= 20
  // close the webcam when the distance is >20
  openWebcam();

  // draw the filter, always draw a filter when detecting face. 
  // The default filter is a transparent png, after user selected, it will changed to the filter that user selected.
  if (faces.length > 0){
    push();
    drawFilter(currentfilter);
    pop();
  }
  
  if (joystickDirection == "UP"){
    // choose filter when button pressed
    if (buttonState == "ON"){
      chooseFilter("happy");
    }
  }
  else if (joystickDirection == "RIGHT"){
    // choose filter when button pressed
    if (buttonState == "ON"){
      chooseFilter("sad");
    }
  }
  else if (joystickDirection == "DOWN"){
    // choose filter when button pressed
    if (buttonState == "ON"){
      chooseFilter("party");
    }
  }
  else if (joystickDirection == "LEFT"){
    // choose filter when button pressed
    if (buttonState == "ON"){
      chooseFilter("hungry");
    }
  }


  serialWriteFilter(filterActive);

}

/**
 * Callback function by serial.js when there is an error on web serial
 * 
 * @param {} eventSender 
 */
function onSerialErrorOccurred(eventSender, error) {
  //console.log("onSerialErrorOccurred", error);
  pHtmlMsg.html(error);
}

/**
 * Callback function by serial.js when web serial connection is opened
 * 
 * @param {} eventSender 
 */
function onSerialConnectionOpened(eventSender) {
  //console.log("onSerialConnectionOpened");
  pHtmlMsg.html("Serial connection opened successfully");
}

/**
 * Callback function by serial.js when web serial connection is closed
 * 
 * @param {} eventSender 
 */
function onSerialConnectionClosed(eventSender) {
  //console.log("onSerialConnectionClosed");
  pHtmlMsg.html("onSerialConnectionClosed");
}

/**
 * Callback function serial.js when new web serial data is received
 * 
 * @param {*} eventSender 
 * @param {String} newData new data received over serial
 */
function onSerialDataReceived(eventSender, newData) {
  console.log("onSerialDataReceived", newData);
  pHtmlMsg.html("onSerialDataReceived: " + newData);
  // Read a line from the serial port
  let inString = newData;
  // If receive data, separate data from the json format and put it in the variable
  // Resource, ChatGPT, I ask it to help me with the code of how to process data that is in json format
  if (inString.length > 0) {
    inString = inString.trim(); // remove any extra whitespace
    try {
      let jsonData = JSON.parse(inString);
      // Now you can access the data as properties of the object:
      let distance = parseInt(jsonData.distance);
      let command = jsonData.command;
      let button = jsonData.button;
      
      console.log("Distance:", distance);
      console.log("Command:", command);
      console.log("Button:", button);
      
      joystickDirection = command;
      buttonState = button;

      /*
      // Check the triggering condition
      if (distance <= 20) {
        console.log(webcamActive);
        // Now check if the webcam is open/active
        if (!webcamActive) {
          webcamActive = true;
        }
      }
      
      else {
        if (webcamActive) {
          // Close the webcam if it's already open
          webcamActive = false;
        }

      }
      */
    } catch (err) {
      console.error("Error parsing JSON:", inString, err);
    }
  }
}

async function serialWriteFilter(filterActive){
  if(serial.isOpen()){
    // if the filter is Active, the arduino should not send data, this is a sign that whether a filter is active
    let strData = filterActive;
    console.log(strData);
    serial.writeLine(strData);
  }
}


function openWebcam() {
  // Code to initialize or activate the webcam
  webcamActive = true;
  // flip the webcam video
  translate(w,0);
  scale(-1,1);

  // open the video as a image
  image(video, 0,0 , w, h);

  console.log("Webcam opened.");
}


function closeWebcam() {
  // Code to initialize or close the webcam
  webcamActive = false;
  video.remove();
  console.log("Webcam closed.");
}

// AR Filter
// Resource: Create AR filters in the browser with ML5.js and P5.js | Creative Coding Tutorial (https://youtu.be/9WywDPOV5nA?si=l1qCxGl25The7iQJ)
function drawFilter(img){
  // set the filter variables, initialize close to our face width
  let filterWidth = faces[0].box.width*1.2;;
  let filterHeight = filterWidth*img.height/img.width; 
  // the filter height should be the ratio as the original one, so we *img.height/img.width

  if (img == happyImg){
    // Set the size for happy filter
    filterWidth = faces[0].box.width*2;
    filterHeight = filterWidth*img.height/img.width; 
    // select the position of the filter, 
    let filterPosX = faces[0].keypoints[195].x;
    let filterPosY = faces[0].keypoints[195].y;

    //rotate the image to follow
    let v=createVector(faces[0].leftEye.centerX - faces[0].rightEye.centerX, faces[0].leftEye.centerY - faces[0].rightEye.centerY)
    let angle = v.heading();
    rotate(angle);

    //draw the filter
    translate(filterPosX,filterPosY);
    image(img, -filterWidth/2, - filterHeight/2, filterWidth, filterHeight);
  }
  if (img == sadImg){
    // Set the size for sad filter
    filterWidth = filterWidth*0.3;
    filterHeight = filterWidth*img.height/img.width;
    // select the position of the filter
    let filterPosX = faces[0].keypoints[50].x;
    let filterPosY = faces[0].keypoints[50].y;


    //draw the filter
    translate(filterPosX,filterPosY);
    image(img, filterWidth*1.2, - filterHeight/2, filterWidth, filterHeight);
  }
  if (img == partyImg){
    // Set the size for party filter
    filterWidth = faces[0].box.width*1.2;
    filterHeight = filterWidth*img.height/img.width; 
    // the filter height should be the ratio as the original one, so we *img.height/img.width
    // select the position of the filter, 
    let filterPosX = faces[0].keypoints[162].x;
    let filterPosY = faces[0].keypoints[162].y;

    //rotate the image to follow
    let v=createVector(faces[0].leftEye.centerX - faces[0].rightEye.centerX, faces[0].leftEye.centerY - faces[0].rightEye.centerY)
    let angle = v.heading();
    rotate(angle);

    //draw the filter
    translate(filterPosX,filterPosY);
    image(img, filterWidth, - filterHeight, filterWidth, filterHeight);
  }
  if (img == hungryImg){
    // Set the size for hungry filter
    filterWidth = faces[0].box.width*2;
    filterHeight = filterWidth*img.height/img.width; 
    // select the position of the filter, 
    let filterPosX = faces[0].keypoints[195].x;
    let filterPosY = faces[0].keypoints[195].y;

    //rotate the image to follow
    let v=createVector(faces[0].leftEye.centerX - faces[0].rightEye.centerX, faces[0].leftEye.centerY - faces[0].rightEye.centerY)
    let angle = v.heading();
    rotate(angle);

    //draw the filter
    translate(filterPosX,filterPosY);
    image(img, -filterWidth/2, - filterHeight/2, filterWidth, filterHeight);
  }
  
}

// button onclick function
// For each filter, set the current filter to the target filter.
// Before playing the sound, ensure that no other audio is playing to prevent overlapping.
// Each audio & filter lest for 10 seconds.
function chooseFilter(name){
  filterActive = true;
  if (name == "happy"){
    currentfilter = happyImg;
    if(!playingSound){
      playingSound = happySound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
    else{
      playingSound.stop();
      playingSound = happySound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
  }
  else if (name == "sad"){
    currentfilter = sadImg;
    if(!playingSound){
      playingSound = sadSound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
    else{
      playingSound.stop();
      playingSound = sadSound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
  }
  else if (name == "party"){
    currentfilter = partyImg;
    if(!playingSound){
      playingSound = partySound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
    else{
      playingSound.stop();
      playingSound = partySound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
  }
  else if (name == "hungry"){
    currentfilter = hungryImg;
    if(!playingSound){
      playingSound = hungrySound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
    else{
      playingSound.stop();
      playingSound = hungrySound;
      playingSound.play();
      playingSound.stop(10);
      setTimeout(cleanFilter,10000);
    }
  }
  else{
    currentfilter = withoutImg;
    cleanFilter();
  }
}

// Clean the filter, set the filter image to a transparent png, and turn the filterActive to false, so the serial can started to send data
function cleanFilter(){
  currentfilter = withoutImg;
  filterActive = false;
}

// Click on the button to connect with Arduino board
function onConnectButtonClick() {
  console.log("Web Serial Button Clicked!")
  if(navigator.serial){
      if(!serial.isOpen()){
          serial.connectAndOpen();
      }
      else{
          console.log("The Web serial has been open already!");
      }
  }
  else{
      alert("xxx");
  }
}
