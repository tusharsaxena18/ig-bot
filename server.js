const express = require("express");
const bodyParser = require("body-parser");

const PAGE_ACCESS_TOKEN = "ENTER_PAGE_TOKEN_HERE";
const IG_USER_ID = "ENTER_IG_USER_ID_HERE"; // This is your Instagram Business Account ID
const VERIFY_TOKEN = "motivationbottoken";

const app = express();
app.use(bodyParser.json());

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Instagram webhook is listening on port ${PORT}`);
});

// Home page
app.get("/", (req, res) => {
  res.send("IG Bot Deployed! (Instagram DMs Only)");
});

// Webhook verification 
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }
  
  console.log("Webhook verification failed");
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  const body = req.body;

  res.status(200).send("EVENT_RECEIVED");

  console.log("Received webhook:", JSON.stringify(body, null, 2));
  if (body.object !== "instagram") {
    console.log(`Ignoring non-Instagram event: ${body.object}`);
    return;
  }

    body.entry.forEach((entry) => {
      const changes = entry.changes;
      
      changes.forEach((change) => {
        if (change.field === "messages") {
          const event = change.value;
          const message = event.messages?.[0];

          if (!message) {
            console.log("No message found in event");
            return;
          }

          const senderId = event.from?.id;
          
          if (!senderId) {
            console.log("No sender ID found");
            return;
          }

          console.log("Instagram message received:", message);
          console.log("Sender IG User ID:", senderId);

          // Check if this is an echo (message sent by the bot)
          if (message.is_echo) {
            console.log("Ignoring echo message");
            return;
          }

          // Handle text messages
          if (message.text) {
            handleMessage(senderId, message.text);
          } else if (message.attachments) {
            handleAttachment(senderId, message.attachments);
          } else {
            console.log("Message type not supported:", message);
          }
        }
    });
  });
});

// Handle incoming text messages
async function handleMessage(senderId, text) {
  try {
    const reply = `You said: "${text}"`;
    await callSendAPI(senderId, reply);
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

// Handle attachments (images, videos, etc.)
async function handleAttachment(senderId, attachments) {
  try {
    const attachmentType = attachments[0]?.type || "unknown";
    const reply = `I received your ${attachmentType}. Thanks for sharing!`;
    await callSendAPI(senderId, reply);
  } catch (error) {
    console.error("Error handling attachment:", error);
  }
}

// Send reply using Instagram Graph API
async function callSendAPI(senderId, textMessage) {
  const url = `https://graph.facebook.com/v21.0/${IG_USER_ID}/messages`;
  
  const payload = {
    recipient: { id: senderId },
    message: { text: textMessage }
  };

  const urlWithToken = `${url}?access_token=${PAGE_ACCESS_TOKEN}`;
  
  try {
    const apiResponse = await fetch(urlWithToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error("Instagram API Error:", errorData);
      throw new Error(`API request failed: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    console.log("Message sent successfully to Instagram DM:", data);
    return data;
  } catch (err) {
    console.error("Error sending Instagram message:", err);
    throw err;
  }
}

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});