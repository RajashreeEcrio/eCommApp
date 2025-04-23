<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import ChatBubble from "../../Components/ChatBubble/ChatBubble.svelte";
  import TextBox from "../../Components/TextBox/TextBox.svelte";
  import { currentContact } from "../../Store/store";
  import "./style.css";

  $: msg = "";
  let textref;
  let sendref;
  let backref;
  let delref;
  $: chats = [];

  // Focusing the text box
  const handleTextFocus=()=>{
    textref?.focus();
  }

  const messageSend = () => {
    if (msg.trim() === "") {
      alert("Message can't be empty");
    } else {
      let mArray = [...chats];
      mArray.push(msg);
      chats = mArray;
      msg = "";
    }
    handleTextFocus();
  };

  const delMessages = () => {
    chats = [];
  };

  // Handling D-pac navigation
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendref.click();
    } else if (e.key === "SoftLeft") {
      backref.click();
    } else if (e.key === "SoftRight") {
      if (msg.trim !== "") {
        msg = msg.slice(0, msg.length - 1);
      }
    } else if (e.key === "ArrowUp") {
      delref.click();
    }
  };

  // Autofocus Textbox onload
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    handleTextFocus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<div class="screen">
  <!-- header that has username & number -->
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
        <h4 style={{ color: "#fff" }}>{$currentContact.contact_name}</h4>
        <h6 style={{ color: "#fff" }}>{$currentContact.contact_id}</h6>
      </div>
    </div>
    {#if chats.length > 0}
      <button bind:this={delref} class="del" on:click={delMessages}>
        <i class="fa-solid fa-trash"></i>
      </button>
    {/if}
  </div>
  <hr style="color: #999;" />

  <!-- chat screen, where the msgs are displayed -->
  <div class="chatwindow">
    {#if chats.length > 0}
      {#each chats as currentmsg, index}
        <ChatBubble
          message={currentmsg}
          className={index % 2 === 0 ? "sendBubble" : "receiveBubble"}
        />
      {/each}
    {/if}
  </div>

  <!-- has input text box & send button -->
  <div class="box">
    <TextBox
      type="text"
      placeholder={"Message..."}
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
