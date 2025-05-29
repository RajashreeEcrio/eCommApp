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

// Helper function to add a new message to the store
export const addMessage = (msg) => {
  receiveMsgStore.update((messages) => [...messages, msg]);
};

// Helper function to update status of a message by messageId
export const updateMessageStatus = (messageId, status) => {
  receiveMsgStore.update((messages) =>
    messages.map((msg) =>
      msg.messageId === messageId ? { ...msg, status } : msg
    )
  );
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
