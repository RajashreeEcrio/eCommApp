import { writable } from "svelte/store";

// export let contacts = writable([]);
export let currentContact = writable({});
export let sipFormData = writable({
  uname: "",
  password: "",
  phoneNum: "",
  serverIP: "",
  port: "",
});
export let receiveMsg = writable('');
