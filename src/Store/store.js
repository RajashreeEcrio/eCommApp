import { writable } from "svelte/store";

export let currentContact = writable({});
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
export const readReceiptStore = writable([]);
