const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express();
const dotenv = require('dotenv')
const axios = require('axios')
const BlobUtil = require('blob-util');
const fs = require('fs');
const FormData = require('form-data');
// const fetch = require('node-fetch');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const fileUpload = require('express-fileupload');
const ffmpeg = require('fluent-ffmpeg');
dotenv.config();

app.use(express.json())

app.use(cors())



// Define a route for handling video uploads
app.use(fileUpload());

// Define a route for handling video uploads
app.post('/api/upload-video', async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded.',
      });
    }
    // Assuming your frontend sends the video file in the 'video' field of the form data
    const videoFile = req.files.video;

    // You need to implement code to save the video file to a directory or cloud storage.
    // Example: Save to a local directory
    const uploadPath = `./uploads/${videoFile.name}`;
    await videoFile.mv(uploadPath);

    // Convert the uploaded video to audio using ffmpeg
    const audioPath = `./uploads/${videoFile.name.replace(/\.[^/.]+$/, '.mp3')}`;
    await convertVideoToAudio(uploadPath, audioPath);

    // Return relevant information (you may customize this)
    // const text = await convertAudioToText(audioPath);
      // Use FormData to append the audio file
      const form = new FormData();
      form.append('file', fs.createReadStream(audioPath));
  
      // Make a POST request to the Whisper API
      const whisperApiKey = process.env.WHISPER_API_KEY;
      const whisperApiUrl = 'https://whisper-speech-to-text1.p.rapidapi.com/speech-to-text';
  
      const options = {
        method: 'POST',
        url: whisperApiUrl,
        headers: {
          'X-RapidAPI-Key': whisperApiKey,
          'X-RapidAPI-Host': 'whisper-speech-to-text1.p.rapidapi.com',
          ...form.getHeaders(),
        },
        data: form,
      };
  
      const response = await axios.request(options);
      if (!response.data.text) {
        // Handle the case where the expected text is not present in the response
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format');
      }
      
      const transcript = response.data.text;
      console.log(transcript);

    res.json({
      success: true,
      message: 'Video uploaded, converted to audio, and transcribed successfully',
      transcript,
    });
  } catch (error) {
    console.error('Error uploading and converting video:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading and converting video',
      error: error.message,
    });
  }
});

async function convertVideoToAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .toFormat('mp3')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

//speech to text
async function convertAudioToText(audioPath) {
  try {
    const whisperApiKey = process.env.WHISPER_API_KEY; // Replace with your Whisper API key
    const whisperApiUrl = 'https://whisper-speech-to-text1.p.rapidapi.com/speech-to-text';

    const response = await axios.post(
      whisperApiUrl,
      {
        inputs: [{ audio: audioPath }],
        options: { transcript: true },
      },
      {
        headers: {
          Authorization: `Bearer ${whisperApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].transcript;
  } catch (error) {
    console.error('Error converting audio to text:', error);
    throw error;
  }
}
// Your existing routes and code...


mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("db connected")
}).catch(err => console.log(err))

app.listen(process.env.PORT,()=>{
    console.log('server is on')
})

// https://malpha.123tokyo.xyz/get.php/e/85/0-rG98j2DWE.mp3?cid=MmEwMTo0Zjg6YzAxMDo5ZmE2OjoxfE5BfERF&h=Gk_v2SheyY8I7ku0_zNw0Q&s=1694839749&n=James%20Arthur%20-%20At%20My%20Weakest%20%28Lyric%20Video%29 