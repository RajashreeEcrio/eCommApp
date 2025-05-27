import { receiveMsgStore, readReceiptStore } from "../Store/store";

let ua;
const socket = new JsSIP.WebSocketInterface("ws://192.168.1.71:5066");

const generateId = () => Math.random().toString(36).substring(2, 15);

// SIP Registration
export const registerSIP = (data) => {
  return new Promise((resolve, reject) => {
    const configuration = {
      sockets: [socket],
      uri: `sip:${data.phoneNum}@ecrio.com`,
      password: data.password,
    };

    ua = new JsSIP.UA(configuration);
    initializeReceive(ua);

    ua.on("registered", () => {
      console.log("✅ SIP registered");
      resolve(true);
    });

    ua.on("registrationFailed", (e) => {
      console.error("❌ SIP registration failed", e);
      reject(false);
    });

    ua.start();
  });
};

// Send CPIM message with delivery + read receipt request
export const sendMessage = (to, message, senderUri) => {
  if (!ua || !ua.isRegistered()) {
    console.error("❌ SIP UA not initialized or not registered");
    return;
  }

  const now = new Date().toISOString();
  const messageId = generateId();
  const contributionId = generateId();

  const cpimBody =
    `From: <sip:${senderUri}@ecrio.com>\r\n` +
    `To: <sip:${to}@ecrio.com>\r\n` +
    `DateTime: ${now}\r\n` +
    `NS: imdn <urn:ietf:params:imdn>\r\n` +
    `imdn.Message-ID: ${messageId}\r\n` +
    `imdn.Disposition-Notification: positive-delivery, display\r\n` +
    `\r\n` +
    `Content-Type: text/plain;charset=UTF-8\r\n` +
    `Content-Length: ${new TextEncoder().encode(`TEXT:::-:::${message}`).length}\r\n` +
    `\r\n` +
    `TEXT:::-:::${message}`;

  const messageOptions = {
    contentType: "message/cpim",
    extraHeaders: [
      'Accept-Contact: *;+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg";require;explicit',
      `P-Preferred-Identity: <sip:${senderUri}@ecrio.com>`,
      'P-Preferred-Service: +g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg"',
      "Request-Disposition: no-fork",
      "Route: <sip:192.168.1.71:9090;lr>",
      `Conversation-ID: ${contributionId}`,
      `Contribution-ID: ${contributionId}`,
    ],
  };

  ua.sendMessage(`sip:${to}@ecrio.com`, cpimBody, messageOptions);

  receiveMsgStore.update(msgs => [...msgs, {
    from: `sip:${senderUri}@ecrio.com`,
    to: `sip:${to}@ecrio.com`,
    content: message,
    datetime: now,
    messageId,
    status: "sent",
  }]);

  console.log("📤 Message sent with ID:", messageId);
};

const initializeReceive = (uaInstance) => {
  uaInstance.on("newMessage", (e) => {
    if (e.originator !== "remote") return;

    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");
    const from = e.request.from.uri;

    if (contentType?.includes("message/cpim")) {
      const parsed = parseCpimBody(rawBody);
      if (!parsed) return;

      // Handle receipt
      if (parsed.imdnType === "positive-delivery" || parsed.imdnType === "display") {
        readReceiptStore.update(receipts => [...receipts, parsed]);

        // Update existing message status
       receiveMsgStore.update(msgs => {
  if (!Array.isArray(msgs)) {
    console.warn("❗ receiveMsgStore is not an array:", msgs);
    return [];
  }

  return msgs.map(msg =>
    msg.messageId === parsed.originalMessageId
      ? { ...msg, status: parsed.imdnType === "display" ? "read" : "delivered" }
      : msg
  );
});


        console.log(`📥 Received ${parsed.imdnType} receipt:`, parsed);
        return;
      }

      // Store new message
      receiveMsgStore.update(msgs => [...msgs, {
        from: parsed.from,
        to: parsed.to,
        content: parsed.content,
        datetime: parsed.datetime,
        messageId: parsed.messageId,
        status: "received",
      }]);

      console.log("📥 New message:", parsed);

      // Send delivery receipt
      sendReceipt(parsed.from, parsed.messageId, "positive-delivery");

      // Simulate read
      setTimeout(() => {
        sendReceipt(parsed.from, parsed.messageId, "display");
      }, 2000);
    }
  });
};

// Parse CPIM
const parseCpimBody = (body) => {
  try {
    const from = (body.match(/^From:\s*(.+)$/m)?.[1] || "").trim();
    const to = (body.match(/^To:\s*(.+)$/m)?.[1] || "").trim();
    const datetime = (body.match(/^DateTime:\s*(.+)$/m)?.[1] || "").trim();
    const messageId = (body.match(/^imdn.Message-ID:\s*(.+)$/m)?.[1] || "").trim();
    const disposition = (body.match(/^imdn.Disposition-Notification:\s*(.+)$/m)?.[1] || "").trim();
    const originalMessageId = (body.match(/^imdn.Original-Message-ID:\s*(.+)$/m)?.[1] || "").trim();
    const content = (body.match(/TEXT:::-:::(.*)/s)?.[1] || "").trim();

    const imdnType =
      disposition.includes("positive-delivery") && content === "" ? "positive-delivery"
      : disposition.includes("display") && content === "" ? "display"
      : null;

    return { from, to, datetime, content, messageId, originalMessageId, imdnType };
  } catch (err) {
    console.error("❌ Failed to parse CPIM:", err);
    return null;
  }
};

// Send receipt
const sendReceipt = (to, originalMessageId, type = "positive-delivery") => {
  if (!ua) return;

  const now = new Date().toISOString();
  const messageId = generateId();

  const cpimReceipt =
    `From: <sip:me@ecrio.com>\r\n` +
    `To: <${to}>\r\n` + // safe in CPIM
    `DateTime: ${now}\r\n` +
    `NS: imdn <urn:ietf:params:imdn>\r\n` +
    `imdn.Message-ID: ${messageId}\r\n` +
    `imdn.Disposition-Notification: ${type}\r\n` +
    `imdn.Original-Message-ID: ${originalMessageId}\r\n` +
    `\r\n` +
    `Content-Type: text/plain;charset=UTF-8\r\n` +
    `Content-Length: 0\r\n\r\n`;

  const options = {
    contentType: "message/cpim",
    extraHeaders: [
      'P-Preferred-Service: +g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg"',
    ],
  };

  // ✅ sanitize for JsSIP sending
  const cleanTo = to.replace(/[<>]/g, "");
  ua.sendMessage(cleanTo, cpimReceipt, options);

  console.log(`📤 Sent ${type} receipt for ${originalMessageId}`);
};

