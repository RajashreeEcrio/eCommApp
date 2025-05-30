import { writable } from "svelte/store";

export let currentContact = writable({});
export const messages = writable([]);
export const receiveMsg = writable(null);
export const messageStatusMap = writable({});
export let sipFormData = writable({
  uname: "",
  password: "",
  phoneNum: "",
  serverIP: "",
  port: "",
});

// Store array of message objects
// { from, to, content, datetime, messageId, status: 'sent' | 'delivered' | 'read' }
export let receiveMsgStore = writable([]);

// Helper function to add a new message to the store (avoid duplicates)
export const addMessage = (msg) => {
  receiveMsgStore.update((messages) => {
    if (messages.find((m) => m.messageId === msg.messageId)) {
      return messages; // message already exists
    }
    return [...messages, msg];
  });
};

// Helper function to update status of a message by messageId
// Returns true if update happened, false if messageId not found
export const updateMessageStatus = (messageId, status) => {
  let updated = false;
  receiveMsgStore.update((messages) =>
    messages.map((msg) => {
      if (msg.messageId === messageId) {
        updated = true;
        return { ...msg, status };
      }
      return msg;
    })
  );
  return updated;
};

// Helper function to clear all messages related to a particular contact (either from or to)
export const clearMessagesForContact = (contactId) => {
  receiveMsgStore.update((messages) =>
    messages.filter(
      (msg) => !msg.from.includes(contactId) && !msg.to.includes(contactId)
    )
  );
};

export const readReceiptStore = writable([]);
