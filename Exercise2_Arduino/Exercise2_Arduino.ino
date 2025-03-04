const int VRX_PIN = A1; // Arduino pin connected to VRX pin
const int VRY_PIN = A0; // Arduino pin connected to VRY pin
const int SW_PIN = 2;  // Arduino pin connected to SW  pin
const int ButtonPin = 4; // Arduino pin connected to Button  pin
const int trigPin = 9;
const int echoPin = 10;

const int LEFT_THRESHOLD = 400;
const int RIGHT_THRESHOLD = 800;
const int UP_THRESHOLD = 400;
const int DOWN_THRESHOLD = 800;

const int COMMAND_NO = 0x00;
const int COMMAND_LEFT = 0x01;
const int COMMAND_RIGHT = 0x02;
const int COMMAND_UP = 0x04;
const int COMMAND_DOWN = 0x08;


int xValue = 0; // To store value of the X axis
int yValue = 0; // To store value of the Y axis
int bValue = 0; // To store value of the button
int command = COMMAND_NO; // Set the initial state of command

int buttonState;  // current button state
int lastButtonState = LOW;    // previous state of the button
// the following variables are unsigned longs because the time, measured in
// milliseconds, will quickly become a bigger number than can be stored in an int.
unsigned long lastDebounceTime = 0;  // the last time the output pin was toggled
unsigned long debounceDelay = 50;    // the debounce time; increase if the output flickers

// defines variables for ultrasonic sensor
long duration;
int distance;

bool filterActive = false;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600) ;
  pinMode(ButtonPin, INPUT); //Sets the ButtonPin as an Input
  pinMode(trigPin, OUTPUT); // Sets the trigPin as an Output
  pinMode(echoPin, INPUT); // Sets the echoPin as an Input
}

void loop() {
  // Check for incoming serial commands from p5.js
  // Check if the filter is on
  if (Serial.available() > 0) {
    String incoming = Serial.readStringUntil('\n');
    incoming.trim(); // Remove any whitespace
    if (incoming == "true") {
      filterActive = true;
    } else if (incoming == "false") {
      filterActive = false;
    }
  }

  // Only send sensor data if the filter is off
  if (!filterActive) {

    // Ultrasonic Value
    // Clears the trigPin
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);

    // Sets the trigPin on HIGH state for 10 micro seconds
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // Reads the echoPin, returns the sound wave travel time in microseconds
    duration = pulseIn(echoPin, HIGH);
    // Calculating the distance using the speed of sound (0.034cm/microsecond)
    distance = duration * 0.034 / 2;

    // Build a JSON-like string containing both sensor and command data
    String data = "{";
    data += "\"distance\":" + String(distance) + ",";
    data += "\"command\":\"";

    // Joystick Value

    // read analog X and Y analog values
    xValue = analogRead(VRX_PIN);
    yValue = analogRead(VRY_PIN);

    // converts the analog value to commands
    // reset commands
    command = COMMAND_NO;

    // check left/right commands
    if (xValue < LEFT_THRESHOLD)
      command = command | COMMAND_LEFT;
    else if (xValue > RIGHT_THRESHOLD)
      command = command | COMMAND_RIGHT;

    // check up/down commands
    if (yValue < UP_THRESHOLD)
      command = command | COMMAND_UP;
    else if (yValue > DOWN_THRESHOLD)
      command = command | COMMAND_DOWN;

    // NOTE: AT A TIME, THERE MAY BE NO COMMAND, ONE COMMAND OR TWO COMMANDS

    // print command to serial and process command
    if (command & COMMAND_LEFT) {
      data += "LEFT";
    }
    else if (command & COMMAND_RIGHT) {
      data += "RIGHT";
    }
    else if (command & COMMAND_UP) {
      data += "UP";
    }
    else if (command & COMMAND_DOWN) {
      data += "DOWN";
    }
    else{
      data += "NONE";
    }
    data += "\",\"button\":\"";

    // Button value
    // read the state of the pushbutton value:
    int reading = digitalRead(ButtonPin);
    // check to see if you just pressed the button
    // (i.e. the input went from LOW to HIGH), and you've waited long enough
    // since the last press to ignore any noise:
  
    // If the switch changed, due to noise or pressing:
    if (reading != lastButtonState) {
      // reset the debouncing timer
      lastDebounceTime = millis();
    }

    if ((millis() - lastDebounceTime) > debounceDelay) {
      // whatever the reading is at, it's been there for longer than the debounce
      // delay, so take it as the actual current state:

      // if the button state has changed:
      if (reading != buttonState) {
        buttonState = reading;

        // set the data for the new button state 
        if (buttonState == HIGH) {
          data += "ON";
        }
        else {
          data += "OFF";
        }
        data += "\"}";
        Serial.println(data);
      }
    }
    lastButtonState = reading;
  }
  delay(50); // Debounce/delay as necessary
}

/*
Resource:
Arduino - Joystick (https://arduinogetstarted.com/tutorials/arduino-joystick)
Getting Started with the HC-SR04 Ultrasonic sensor (https://projecthub.arduino.cc/Isaac100/getting-started-with-the-hc-sr04-ultrasonic-sensor-7cabe1)
Debounce on a Pushbutton (https://docs.arduino.cc/built-in-examples/digital/Debounce/)
*/