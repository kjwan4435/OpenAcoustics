// (c) 2025, KAIST, WIT_LAB, Jiwan Kim (jiwankim@kaist.ac.kr, kjwan4435@gmail.com)

import android.annotation.SuppressLint;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.AsyncTask;
import android.util.Log;

import java.io.BufferedOutputStream;
import java.io.DataOutputStream;
import java.net.Socket;
import java.util.Arrays;

public class DataRecorder {

    // LLAP
    public static final int  AUDIO_SAMPLE_RATE = Utilities.SamplingRate;       //Record sample rate
    public static final int MAX_FRAME_SIZE = Utilities.SamplingRate/25;        //Number of frame size
    private static final String TAG = "Data Recorder";

    // Recorder
    public static DataRecorder dataRecorder = new DataRecorder();
    static int device                       = MediaRecorder.AudioSource.MIC;   // for S21
    private static final int CHANNEL        = AudioFormat.CHANNEL_IN_STEREO;   // use stereo to get top and bottom mics (one/channel)
    private static final int FORMAT         = AudioFormat.ENCODING_PCM_16BIT;  // standard encoding
    private static final int RECORDING_RATE = Utilities.SamplingRate;          // DVD quality (max)
    private AudioRecord recorder;


    // the start and stop times
    long recordingStartTime;
    long recordingStopTime;

    // the minimum buffer size needed for audio recording - 7680 for 48000, STEREO(2), PCM_16BIT, or 1/25 of a second (40ms).
    private int BUFFER_SIZE = AudioRecord.getMinBufferSize(RECORDING_RATE, CHANNEL, FORMAT);

    // are we currently sending audio data
    boolean currentlyRecordingAudio = false;

    boolean sendMsg;

    public void startStreamingAudio(String ip, int duration, int id) {
        currentlyRecordingAudio = true;
        sendMsg = true;// be default we send the message
        startStreaming(ip, duration, id);
    }

    public void stopStreamingAudio() {
        stopStreamingAudio(true);
    }

    private void stopStreamingAudio(boolean sendMsgIn) {
        sendMsg = sendMsgIn;
        currentlyRecordingAudio = false;
    }
    private void startStreaming(final String ip, final int duration, final int id) {

        recordingStartTime = recordingStopTime = -1; // blank it.
        Thread streamThread = new Thread(new Runnable() {

            @SuppressLint("MissingPermission")
            @Override
            public void run() {
                BUFFER_SIZE = MAX_FRAME_SIZE * 4;
                int maxPackets = duration * (AUDIO_SAMPLE_RATE / MAX_FRAME_SIZE);
                Log.w(TAG, "Log/ maxPackets: " + maxPackets);

                int extraBytes = 10;
                byte[] buffer = new byte[extraBytes + (BUFFER_SIZE * maxPackets)];


                // make the header for the sound file
                buffer[0] = 'S';
                buffer[1] = 'O';
                buffer[2] = 'U';
                buffer[3] = 'N';
                buffer[4] = 'D';
                byte[] num = Utilities.leftPad(Integer.toString(id), 5).getBytes();
                buffer[5] = num[0];
                buffer[6] = num[1];
                buffer[7] = num[2];
                buffer[8] = num[3];
                buffer[9] = num[4];

                int count = 0;

                try {
                    recorder = new AudioRecord(device, RECORDING_RATE, CHANNEL, FORMAT, (int)(BUFFER_SIZE));
                    recorder.startRecording();
                    recordingStartTime = System.currentTimeMillis();
//                    startTrial(recordingStartTime);
                    Log.w(TAG, "Log/ " + "Blocks: " + Utilities.BlockCounter + " / TrialNumber, EndCounter: " + Utilities.TrialCounter + ", " + Utilities.TrialEndCounter);
                    Log.w(TAG, "Log/ maxPackets: " + maxPackets);

                    while (currentlyRecordingAudio) {
                        int read = recorder.read(buffer, extraBytes + (BUFFER_SIZE*count), BUFFER_SIZE);
                        if (count==maxPackets) {
                            if (Utilities.IsRealtimeStreaming) {
                                // make the header for the sound file
                                buffer[0] = 'R';
                                buffer[1] = 'T';
                                buffer[2] = 'E';
                                buffer[3] = 'N';
                                buffer[4] = 'D';
                                send_request(ip, buffer, 10);
                            }
                            currentlyRecordingAudio = false;
                        }
                        else {
                            if (Utilities.IsRealtimeStreaming) {
                                int start = extraBytes + (BUFFER_SIZE*count);
                                int end = start + BUFFER_SIZE;
                                if (count == 0) {
                                    buffer[0] = 'R';
                                    buffer[1] = 'T';
                                    buffer[2] = 'B';
                                    buffer[3] = 'G';
                                    buffer[4] = 'N';
                                    send_request(ip, buffer, 10);
                                } else {
                                    byte[] packet = Arrays.copyOfRange(buffer, start, end);
                                    send_request(ip, packet, BUFFER_SIZE);
                                }
                            }
                            count++;
                        }
                    }
                    recordingStopTime = System.currentTimeMillis(); // not reading after this point, so should be fairly accurate....
                    Log.w(TAG, "Log/ Recording Start Time: " + recordingStartTime + " / Recording Stop Time: " + recordingStopTime);
                }
                catch (Exception e) {
                    Log.w(TAG, "Log/ TCP Streamer Exception: " + e);
                }
                recorder.stop();

                if (sendMsg && !Utilities.IsRealtimeStreaming)
                    send_request(ip, buffer, extraBytes + (BUFFER_SIZE*count)); // if this always going to be correct? Will count vary? Are we chopping off the end here?
                recorder.release();
            }
        }
        );

        // start the thread
        streamThread.start();
    }

    public void send_request(String ip, byte[] buf, int bufSize) {
        send_request sr = new send_request();
        sr.setIP(ip);
        sr.setBuffer(buf, bufSize);
        sr.execute();
    }

    public static void sendMsgString(String ip, String s) {
        send_request sr = new send_request();
        sr.setIP(ip);
        byte[] b = s.getBytes();
        sr.setBuffer(b, b.length);
        Log.w(TAG, "BUFFER SENT: " + b + ", " + b.length);
        sr.execute();
    }


}

class send_request extends AsyncTask<Void, Void, String> {
    private static final String TAG = "TCP streamer";

    String ip;
    byte[] buffer;
    int bufferSize;

    void setBuffer(byte[] buf, int bufSize)
    {
        buffer = new byte[bufSize];
        for (int i=0; i<bufSize; i++)
            buffer[i] = buf[i]; // make a local copy.
        bufferSize = bufSize;
    }

    void setIP(String ipIn) {ip = ipIn;}

    // doInBackground: task for threading
    @Override
    protected String doInBackground(Void... voids) {
        try {
            Log.w(TAG, "Trying to send: " + buffer.length + " bytes");
            Socket s = new Socket(ip, 12345);
            DataOutputStream out = new DataOutputStream(new BufferedOutputStream(s.getOutputStream()));
            out.write(buffer, 0, buffer.length); // this sends the write data out
            out.flush();
            Log.w(TAG, "Succeed to send: "+ out.size() + "bytes");
            out.close();
            s.close(); // this causes some problem?
        }
        catch (Exception e) {
            Log.w(TAG, "Failed to connect: " + e);
        }
        return null;
    }
}
