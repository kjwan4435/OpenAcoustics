## Publications
If you use this code in your reseach, please cite our open-source project: 
```
@inproceedings{OpenAcoustics_25_Kim,
author = {Kim, Jiwan and Jung, Hohurn and Oakley, Ian},
title = {OpenAcoustics: An Open-Source Framework for Acoustic Data Capture on Smart Devices and Microcontrollers},
year = {2025},
}
```
Three external library was used for our BLE data transmission project.

* `<bluefruit.h>` : Fundamental library for BLE communication
  * Refer below link for the installation of the library.
    ```
    https://github.com/adafruit/Adafruit_nRF52_Arduino/tree/master
    ```
* `<PDM.h>` : Enables PDM microphone data capture
  * Please check whether your board supports PDM microphone library.
* `<LSM6DS3.h>` : Library related to IMU data collection
  


Our transmission system basically uses <bluefruit.h> library which is a part of Adafruit’s Bluefruit nRF52 Libraries, and it only supports Adafruit boards based on the Nordic nRF52 chipset. Thus our system supports boards which are listed below.
* Adafruit Feather nRF52832
* Adafruit Feather nRF52840 Express
* Adafruit ItsyBitsy nRF52840 Express
* Adafruit Clue
* Adafruit Circuit Playground Bluefruit
* Adafruit Metro nRF52840 Express
* Adafruit EdgeBadge
* Adafruit Bluefruit Sense

The system also supports seeed studio XIAO boards when the code uploaded through Adafruit's core and bootloader.

* XIAO nRF52840
* XIAO nRF52840 Sense

If you are using `XIAO nRF52840 Sense` board for your project, please select board manager `Seeed nRF52 Boards` not Seeed nRF52 mbed-enabled Boards.
```
Tools > Boards > Seeed nRF52 Boards > XIAO nRF52840 Sense (O)
```
```
Tools > Boards > Seeed nRF52 mbed-enabled Boards > XIAO nRF52840 Sense (X)
```

