import { writable } from "svelte/store";
import { normalize } from "../utils/normalize";

// Current active contact
export const currentContact = writable({});

// Store all messages (sent and received)
// Each message: { from, to, content, datetime, messageId, status }
export const messages = writable([]);

// User SIP login form data
export const sipFormData = writable({
  uname: "",
  password: "",
  phoneNum: "",
  serverIP: "",
  port: "",
});


// Map messageId → status for quick status lookup (optional)
export const messageStatusMap = writable({});

// Add a new message, avoid duplicates by messageId
export const addMessage = (msg) => {
  // Normalize sender and receiver before adding
  const normalizedMsg = {
    ...msg,
    from: normalize(msg.from),
    to: normalize(msg.to),
  };
  console.log(normalizedMsg);

  messages.update((msgs) => {
    if (msgs.find((m) => m.messageId === normalizedMsg.messageId)) {
      return msgs;
    }
    return [...msgs, normalizedMsg];
  });
};

// Update the status of a message by messageId
// Also sync status in messageStatusMap
export const updateMessageStatus = (messageId, status) => {
  let updated = false;

  messages.update((msgs) =>
    msgs.map((msg) => {
      if (msg.messageId === messageId) {
        // Only allow status to progress forward
        if (
          (msg.status === "sent" &&
            (status === "delivered" || status === "read")) ||
          (msg.status === "delivered" && status === "read") ||
          msg.status === undefined
        ) {
          updated = true;
          return { ...msg, status };
        }
      }
      return msg;
    })
  );

  if (updated) {
    messageStatusMap.update((map) => {
      const newMap = { ...map, [messageId]: status };
      console.log("IMDN RECEIPT RECEIVED: Status updated", newMap);
      return newMap;
    });
  } else {
    console.warn(
      "IMDN received but messageId not found or invalid status transition:",
      messageId,
      "Current:",
      msg.status,
      "Attempted:",
      status
    );
  }
  return updated;
};
// Clear all messages related to a specific contactId (either sender or receiver)
export const clearMessagesForContact = (contactId) => {
  messages.update((msgs) =>
    msgs.filter(
      (msg) =>
        normalize(msg.from) !== contactId && normalize(msg.to) !== contactId
    )
  );
};
