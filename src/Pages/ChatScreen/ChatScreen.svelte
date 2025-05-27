<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import { currentContact, receiveMsgStore, sipFormData } from "../../Store/store";
  import { sendMessage } from "../../JsSIP/sip";
  import "./style.css";

  $: msg = "";
  let textref;
  let sendref;
  let backref;
  let delref;
  $: chats = [];

  const handleTextFocus = () => {
    textref?.focus();
  };

 const updateMessageTickUI = (messageId, status) => {
  chats = chats.map(chat =>
    chat.id === messageId ? { ...chat, status } : chat
  );
};


  const messageSend = () => {
    if (msg.trim() === "") {
      alert("Message can't be empty");
      return;
    }
    const messageId = Date.now(); // unique ID
    chats = [
      ...chats,
      {
        id: messageId,
        messagebody: msg,
        className: "send",
        status: "sent"
      }
    ];
    sendMessage($currentContact.contact_id, msg, $sipFormData.phoneNum, messageId);
    updateMessageTickUI(messageId, "sent");
    msg = "";
    handleTextFocus();
  };

  const delMessages = () => {
    chats = [];
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && sendref) {
      sendref.click();
    } else if (e.key === "SoftLeft" && backref) {
      backref.click();
    } else if (e.key === "SoftRight") {
      if (msg.trim() !== "") {
        msg = msg.slice(0, -1);
      }
    } else if (e.key === "ArrowUp" && delref) {
      delref.click();
    }
  };

  $: if ($receiveMsgStore) {
  const messageId = Date.now() + Math.floor(Math.random() * 1000);
  chats = [
    ...chats,
    {
      id: messageId,
      messagebody: $receiveMsgStore,
      className: "receive",
      status: "delivered"
    }
  ];
  updateMessageTickUI(messageId, "delivered");
  receiveMsgStore.set(""); // reset after handling
}


  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    handleTextFocus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="screen">
  <div class="header">
    <div class="leftbox">
      <button
        bind:this={backref}
        class="back"
        tabIndex="0"
        on:click={() => push("/contacts")}
      >
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <div class="uname">
        <h4 style="color: #fff;">{$currentContact.contact_name}</h4>
        <h6 style="color: #fff;">{$currentContact.contact_id}</h6>
      </div>
    </div>
    {#if chats.length > 0}
      <button bind:this={delref} class="del" on:click={delMessages}>
        <i class="fa-solid fa-trash"></i>
      </button>
    {/if}
  </div>

  <hr style="color: #999;" />

  <div class="chatwindow">
    {#if chats.length > 0}
      {#each chats as currentmsg (currentmsg.id)}
        <ChatBubble
          id={currentmsg.id}
          message={currentmsg.messagebody}
          status={currentmsg.status}
          className={currentmsg.className === "send" ? "sendBubble" : "receiveBubble"}
        />
      {/each}
    {/if}
  </div>

  <div class="box">
    <TextBox
      type="text"
      placeholder="Message..."
      className="textbox"
      onInput={(e) => (msg = e.target.value)}
      value={msg}
      bind:ref={textref}
    />
    <button bind:this={sendref} on:click={messageSend} class="sendBtn">
      <i class="fa-solid fa-paper-plane"></i>
    </button>
  </div>
</div>
