import { receiveMsgStore, readReceiptStore } from "../Store/store";

let ua;
const socket = new JsSIP.WebSocketInterface("ws://192.168.1.71:5071");

// Generate unique ID
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
      console.log("SIP registered");
      resolve(true);
    });

    ua.on("registrationFailed", (e) => {
      console.error("SIP registration failed", e);
      reject(false);
    });

    ua.start();
  });
};

// Send CPIM message with delivery and read receipt request
export const sendMessage = (to, message, senderUri) => {
  if (!ua || !ua.isRegistered()) {
    console.error("SIP UA not initialized or not registered");
    return;
  }

  const now = new Date().toISOString();
  const messageId = generateId();
  const contributionId = generateId();

  const normalizeUri = (uri) => uri.replace(/^sip:/, "");
  const fromUri = normalizeUri(senderUri);
  const toUri = normalizeUri(to);

  const cpimBody =
    `From: <sip:${fromUri}@ecrio.com>\r\n` +
    `To: <sip:${toUri}@ecrio.com>\r\n` +
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
      `P-Preferred-Identity: <sip:${fromUri}@ecrio.com>`,
      'P-Preferred-Service: +g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg"',
      "Request-Disposition: no-fork",
      "Route: <sip:192.168.1.71:9090;lr>",
      `Conversation-ID: ${contributionId}`,
      `Contribution-ID: ${contributionId}`,
    ],
    eventHandlers: {
      succeeded: (e) => console.log("Message sent successfully", e),
      failed: (e) => console.error("Message sending failed", e),
    },
  };

  ua.sendMessage(`sip:${toUri}@ecrio.com`, cpimBody, messageOptions);

  receiveMsgStore.update((msgs) => {
    const list = Array.isArray(msgs) ? msgs : [];
    return [
      ...list,
      {
        from: `sip:${fromUri}@ecrio.com`,
        to: `sip:${toUri}@ecrio.com`,
        content: message,
        datetime: now,
        messageId,
        status: "sent",
      },
    ];
  });
};

// Initialize receiver logic
const initializeReceive = (uaInstance) => {
  uaInstance.on("newMessage", (e) => {
    if (e.originator !== "remote") return;

    const rawBody = e.request.body;
    const contentType = e.request.getHeader("Content-Type");

    if (contentType?.includes("message/cpim")) {
      const parsed = parseCpimBody(rawBody);
      if (!parsed) return;

      // Ignore messages from self to avoid duplicate display
     const ownUri = uaInstance.configuration.uri.toString().toLowerCase();
if (parsed.from.toLowerCase() === ownUri) {
  console.log("Ignoring message from self");
  return;
}


      if (parsed.imdnType === "positive-delivery" || parsed.imdnType === "display") {
        readReceiptStore.update((receipts) => {
          const list = Array.isArray(receipts) ? receipts : [];
          return [...list, parsed];
        });

        receiveMsgStore.update((msgs) => {
          const list = Array.isArray(msgs) ? msgs : [];
          return list.map((msg) =>
            msg.messageId === parsed.messageId &&
            msg.from === parsed.to &&
            msg.to === parsed.from
              ? { ...msg, status: parsed.imdnType }
              : msg
          );
        });

        console.log(`Received ${parsed.imdnType} receipt:`, parsed);
        return;
      }
      
      // New message received
      receiveMsgStore.update((msgs) => {
        const list = Array.isArray(msgs) ? msgs : [];
        return [
          ...list,
          {
            from: parsed.from,
            to: parsed.to,
            content: parsed.content,
            datetime: parsed.datetime,
            messageId: parsed.messageId,
            status: "received",
          },
        ];
      });

      console.log("New message received:", parsed);

      // Auto-send receipts
      sendReceipt(parsed.from, parsed.messageId, "positive-delivery");
      setTimeout(() => {
        sendReceipt(parsed.from, parsed.messageId, "display");
      }, 2000);
    }
  });
};

// CPIM Parser
const parseCpimBody = (body) => {
  try {
    const from = (body.match(/^From:\s*<(sip:[^>]+)>/m)?.[1] || "").trim();
    const to = (body.match(/^To:\s*<(sip:[^>]+)>/m)?.[1] || "").trim();
    const datetime = (body.match(/^DateTime:\s*(.+)$/m)?.[1] || "").trim();
    const messageId = (body.match(/^imdn.Message-ID:\s*(.+)$/m)?.[1] || "").trim();
    const disposition = (body.match(/^imdn.Disposition-Notification:\s*(.+)$/m)?.[1] || "").trim();
    const originalMessageId = (body.match(/^imdn.Original-Message-ID:\s*(.+)$/m)?.[1] || "").trim();

    const split = body.split(/\r?\n\r?\n/);
    const content = split.length > 2 ? split[2].trim().replace(/^TEXT:::-:::/, "") : "";

    const imdnType =
      disposition.includes("positive-delivery") && !content ? "positive-delivery" :
      disposition.includes("display") && !content ? "display" :
      null;

    return { from, to, datetime, content, messageId, originalMessageId, imdnType };
  } catch (err) {
    console.error("Failed to parse CPIM:", err, "\nRaw Body:", body);
    return null;
  }
};

// Send IMDN receipt
const sendReceipt = (to, originalMessageId, type) => {
  const now = new Date().toISOString();
  const messageId = generateId();
  const from = ua.configuration.uri;

  const normalizeUri = (uri) => uri.replace(/^sip:/, "");
  const fromUri = normalizeUri(from);
  const toUri = normalizeUri(to);

  const cpimBody =
    `From: <sip:${fromUri}@ecrio.com>\r\n` +
    `To: <sip:${toUri}@ecrio.com>\r\n` +
    `DateTime: ${now}\r\n` +
    `NS: imdn <urn:ietf:params:imdn>\r\n` +
    `imdn.Message-ID: ${messageId}\r\n` +
    `imdn.Original-Message-ID: ${originalMessageId}\r\n` +
    `imdn.Disposition-Notification: ${type}\r\n` +
    `\r\n`;

  const messageOptions = {
    contentType: "message/cpim",
    extraHeaders: [
      `P-Preferred-Identity: <sip:${fromUri}@ecrio.com>`,
      "Request-Disposition: no-fork",
      "Route: <sip:192.168.1.71:9090;lr>",
    ],
    eventHandlers: {
      succeeded: () => console.log(`${type} receipt sent`),
      failed: (e) => console.error(`Failed to send ${type} receipt`, e),
    },
  };

  ua.sendMessage(`sip:${toUri}@ecrio.com`, cpimBody, messageOptions);
};
