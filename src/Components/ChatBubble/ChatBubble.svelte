<script>
  import { receiveMsg, messageStatusMap, messages } from '../../Store/store.js';
  import JsSIP from "jssip";
   export let className = "";
   export let message;
  let ua;
  const socket = new JsSIP.WebSocketInterface("ws://192.168.1.71:5066");

  export const registerSIP = (data) => {
    return new Promise((resolve, reject) => {
      const configuration = {
        sockets: [socket],
        uri: `sip:${data.phoneNum}@ecrio.com`,
        password: data.password,
      };

      ua = new JsSIP.UA(configuration);

      ua.on("registered", () => {
        console.log("SIP registered");
        resolve(true);
      });

      ua.on("registrationFailed", (e) => {
        console.error("SIP registration failed", e);
        reject(false);
      });

      initializeReceive(ua);
      ua.start();
    });
  };

  const generateContributionId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  export const sendMessage = (to, message, senderUri, msgId) => {
    if (!ua) {
      console.log("SIP UA not initialized");
      return;
    }

    const now = new Date().toISOString();
    const contributionId = msgId || generateContributionId();

    const cpimBody =
      `From: <sip:${senderUri}@ecrio.com>\r\n` +
      `To: <sip:${to}@ecrio.com>\r\n` +
      `DateTime: ${now}\r\n` +
      `NS: imdn <urn:ietf:params:imdn>\r\n` +
      `imdn.Message-ID: ${contributionId}\r\n` +
      `imdn.Disposition-Notification: positive-delivery,display\r\n` +
      `\r\n` +
      `Content-Type: text/plain;charset=UTF-8\r\n` +
      `Content-Length: ${message.length + 11}\r\n` +
      `\r\n` +
      `TEXT:::-:::${message}`;

    const messageOptions = {
      contentType: "message/cpim",
      extraHeaders: [
        'Accept-Contact: *;+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg";require;explicit',
        `P-Preferred-Identity: <sip:${senderUri}@ecrio.com>`,
        'P-Preferred-Service: +g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.oma.cpm.msg"',
        "Request-Disposition: no-fork",
        "Route: <sip:192.168.172.50:9090;lr>",
        `Conversation-ID: ${contributionId}`,
        `Contribution-ID: ${contributionId}`,
      ],
    };

    const target = `sip:${to}@ecrio.com`;
    const sentMsg = ua.sendMessage(target, cpimBody, messageOptions);

    messageStatusMap.update((map) => ({
      ...map,
      [contributionId]: "sent",
    }));

    messages.update((msgs) => [
      ...msgs,
      {
        id: contributionId,
        text: message,
        sender: senderUri,
        timestamp: now,
      },
    ]);

    sentMsg.on("succeeded", () => {
      messageStatusMap.update((map) => ({
        ...map,
        [contributionId]: "delivered",
      }));

      setTimeout(() => {
        messageStatusMap.update((map) => ({
          ...map,
          [contributionId]: "read",
        }));
      }, 2000);
    });

    sentMsg.on("failed", (error) => {
      console.error("Message failed to send:", error);
      messageStatusMap.update((map) => ({
        ...map,
        [contributionId]: "failed",
      }));
    });

    console.log("Message sent:", contributionId);
  };

  const parseCpimBody = (body) => {
    const contentMatch = body.match(/TEXT:::-:::(.*)/s);
    const idMatch = body.match(/imdn.Message-ID:\s*(.+)/);
    const dispositionMatch = body.match(/Disposition:\s*(.+)/);

    return {
      content: contentMatch ? contentMatch[1].trim() : null,
      msgId: idMatch ? idMatch[1].trim() : null,
      disposition: dispositionMatch ? dispositionMatch[1].trim() : null,
    };
  };

  const initializeReceive = (uaInstance) => {
    uaInstance.on("newMessage", (e) => {
      if (e.originator !== "remote") return;

      const rawBody = e.request.body;
      const contentType = e.request.getHeader("Content-Type");

      if (!rawBody || !contentType) return;

      // Handle IMDN receipts
      if (contentType.includes("message/imdn+xml")) {
        const msgIdMatch = rawBody.match(/<imdn:message-id>([^<]+)<\/imdn:message-id>/i);
        const statusMatch =
          rawBody.match(/<imdn:status>[^<]*<imdn:displayed\/?>/i) ||
          rawBody.match(/<imdn:status>[^<]*<imdn:delivered\/?>/i);

        const messageId = msgIdMatch ? msgIdMatch[1].trim() : null;

        if (messageId && statusMatch) {
          messageStatusMap.update((map) => {
            if (statusMatch[0].includes("displayed")) {
              map[messageId] = "read";
            } else if (statusMatch[0].includes("delivered")) {
              map[messageId] = "delivered";
            }
            return { ...map };
          });

          console.log(`IMDN receipt: ${statusMatch[0]} for message ${messageId}`);
        }
      }

      // Handle CPIM message
      else if (contentType.includes("message/cpim")) {
        const parsed = parseCpimBody(rawBody);

        if (parsed.disposition) {
          if (parsed.disposition.includes("positive-delivery")) {
            messageStatusMap.update((map) => {
              map[parsed.msgId] = "delivered";
              return { ...map };
            });
          } else if (parsed.disposition.includes("display")) {
            messageStatusMap.update((map) => {
              map[parsed.msgId] = "read";
              return { ...map };
            });
          }
        } else if (parsed.content) {
          receiveMsg.set(parsed.content);
          messages.update((msgs) => [
            ...msgs,
            {
              id: parsed.msgId,
              text: parsed.content,
              sender: e.request.from.uri,
              timestamp: new Date().toISOString(),
            },
          ]);

          // Send read receipt
          const now = new Date().toISOString();
          const readReceipt =
            `From: <${e.request.from.uri}>\r\n` +
            `To: <${ua.configuration.uri}>\r\n` +
            `DateTime: ${now}\r\n` +
            `NS: imdn <urn:ietf:params:imdn>\r\n` +
            `imdn.Message-ID: ${parsed.msgId}\r\n` +
            `Disposition: display\r\n\r\n`;

          ua.sendMessage(e.request.from.uri, readReceipt, {
            contentType: "message/cpim",
          });
        }
      }

      // Handle plain MESSAGE (fallback)
      else {
        const message = {
          sender: e.request.from.uri,
          content: rawBody,
        };

        receiveMsg.set(message.content);
        messages.update((msgs) => [
          ...msgs,
          {
            id: generateContributionId(),
            text: message.content,
            sender: message.sender,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });
  };

  export const isSIPRegistered = () => {
    return ua ? ua.isRegistered() : false;
  };
</script>

<style>
  /* Add styling for your chat bubbles */
  .sendBubble {
    background-color: #DCF8C6;
    text-align: right;
    padding: 8px;
    margin: 5px 10px;
    border-radius: 10px;
    max-width: 80%;
    align-self: flex-end;
  }
  .receiveBubble {
    background-color: #FFF;
    text-align: left;
    padding: 8px;
    margin: 5px 10px;
    border-radius: 10px;
    max-width: 80%;
    align-self: flex-start;
  }
</style>

<div class={className}>
  <p>{message}</p>
  {#if status}
    <small>{status}</small>
  {/if}
</div>
