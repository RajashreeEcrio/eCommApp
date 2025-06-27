<script>
  export let id = "";
  export let message = "";
  export let className = "";
  export let status = ""; // "sent", "delivered", "read"
  export let type = "text";
  export let time = "";

  import TimeStamp from "../TimeStamp/TimeStamp.svelte";
</script>

{#if type === "image"}
  <div {id} class={className === "sendImageBubble" ? "sendImgBox" : "receiveImgBox"}>
    <img src={message} alt="" class={className} />
    <div class="timeNstatus">
      <TimeStamp {time} />

      {#if className === "sendImageBubble" && status}
        <span class="tick">
          {#if status === "sent"}
            ✓
          {:else if status === "delivered"}
            ✓✓
          {:else if status === "read"}
            <span class="blue-ticks">✓✓</span>
          {/if}
        </span>
      {/if}
    </div>
  </div>
{:else}
  <div {id} class={"chat-bubble " + className}>
    <div class="content">
      <span class="msg">{message}</span>
      <div class="timeNstatus">
        <TimeStamp {time} />

        {#if className === "sendBubble" && status}
          <span class="tick">
            {#if status === "sent"}
              ✓
            {:else if status === "delivered"}
              ✓✓
            {:else if status === "read"}
              <span class="blue-ticks">✓✓</span>
            {/if}
          </span>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .chat-bubble {
    max-width: 80%;
    margin: 4px;
    padding: 6px 10px;
    border-radius: 12px;
    font-size: 14px;
    word-wrap: break-word;
    display: flex;
    flex-direction: column;
    align-self: flex-start;
  }

  .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .sendBubble {
    align-self: flex-end;
    background: rgba(92, 128, 0, 0.924);
    color: white;
    border-top-right-radius: 0;
  }

  .receiveBubble {
    align-self: flex-start;
    background: rgba(54, 137, 202, 1);
    color: #fff;
    border-top-left-radius: 0;
  }

  .sendImgBox {
    display: flex;
    flex-direction: column;
    align-self: flex-end;
    /* align-items: center; */
    margin: 2vh 3vw;
    gap: 1vw;
    background: rgba(92, 128, 0, 0.924);
    padding: 1.5vh 1.5vw 0.5vh 1.5vw;
    border-radius: 4px;
  }

  .receiveImgBox {
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    /* align-items: center; */
    margin: 2vh 3vw;
    gap: 1.15vw;
    background: rgba(54, 137, 202, 1);
    padding: 1.5vh 1.5vw 0.5vh 1.5vw;
    border-radius: 4px;
  }

  .timeNstatus {
    display: flex;
    /* align-self: inherit; */
    gap: 2vw;
    justify-content: flex-end;
    align-items: center;
  }

  .tick {
    font-size: 0.6rem;
    opacity: 0.8;
    white-space: nowrap;
    color: #fff;
  }

  .blue-ticks {
    color: rgb(0 255 38);
  }

  .msg {
    word-break: break-word;
  }
</style>
